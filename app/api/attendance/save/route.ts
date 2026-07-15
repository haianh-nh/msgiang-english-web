import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { teacherForUser } from "@/lib/classes";


function isMissingAttendanceFastRpc(error: any) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return error?.code === "PGRST202"
    || error?.code === "42883"
    || (message.includes("official_save_attendance_fast")
      && (message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find")));
}

function attendanceResponse(payload: any, status = 200, timings: Record<string, number> = {}, mode = "legacy") {
  const serverTiming = Object.entries(timings)
    .filter(([, value]) => Number.isFinite(value))
    .map(([key, value]) => `${key};dur=${Math.max(0, value).toFixed(1)}`)
    .join(",");
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Attendance-Mode": mode,
      ...(serverTiming ? { "Server-Timing": serverTiming } : {}),
    },
  });
}

function monthFromSessionKey(key: any) {
  const parts = String(key || "").split("|");
  const date = parts.length >= 2 ? parts[1] : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : "";
}

function isMissingDeletedMonthsTable(error: any) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return error?.code === "42P01" || msg.includes("official_makeup_deleted_months") || msg.includes("does not exist");
}

async function deletedSourceMonthSet(supabase: any, sourceSessionKeys: any[]) {
  const months = Array.from(new Set((sourceSessionKeys || []).map(monthFromSessionKey).filter(Boolean)));
  if (!months.length) return new Set<string>();
  const { data, error } = await supabase
    .from("official_makeup_deleted_months")
    .select("month_key")
    .in("month_key", months);
  if (error) {
    if (isMissingDeletedMonthsTable(error)) return new Set<string>();
    throw error;
  }
  return new Set((data || []).map((r: any) => String(r.month_key || "")).filter(Boolean));
}

function absenceId(studentId: string, sessionKey: string) {
  return `${sessionKey}__${studentId}`;
}

function sessionLabelFromBody(body: any) {
  const date = body.date || "";
  const slot = `${body.start || ""}-${body.end || ""}`.replace("-", " - ");
  return `${body.day || ""} ${date} • ${slot}`.trim();
}

function validDate(v: any) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "";
}

function validTime(v: any) {
  const s = String(v || "").slice(0, 5);
  return /^\d{2}:\d{2}$/.test(s) ? s : "";
}

function attendanceStarted(body: any) {
  const date = validDate(body.date);
  const start = validTime(body.start);
  if (!date || !start) return false;
  const startAt = new Date(`${date}T${start}:00+07:00`);
  const now = new Date();
  return Number.isFinite(startAt.getTime()) && now >= startAt;
}

function attendanceWindowOpen(body: any) {
  const date = validDate(body.date);
  const start = validTime(body.start);
  if (!date || !start) return false;
  const openAt = new Date(`${date}T${start}:00+07:00`);
  const closeAt = new Date(`${date}T23:59:59+07:00`);
  const now = new Date();
  return Number.isFinite(openAt.getTime()) && now >= openAt && now <= closeAt;
}

function normalizeRows(rows: any) {
  return Object.values(rows || {})
    .filter((r: any) => r && r.studentId && r.type && r.status)
    .map((r: any) => ({
      session_key: "",
      student_id: String(r.studentId),
      row_type: String(r.type),
      status: String(r.status),
      note: r.note || null,
      updated_at: new Date().toISOString(),
    }));
}

function mapAbsenceRecord(a: any) {
  return {
    id: a.id,
    studentId: a.student_id,
    sourceClassId: a.source_class_id,
    sourceSessionKey: a.source_session_key,
    sourceSessionLabel: a.source_session_label,
    reason: a.reason || "Vắng",
    generatedFromAttendance: !!a.generated_from_attendance,
    status: a.status || "pending",
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

async function cancelMakeupPlansForCorrectedAbsences(supabase: any, absenceIds: string[]) {
  const ids = [...new Set((absenceIds || []).map(String).filter(Boolean))];
  if (!ids.length) return { makeupPlanUpdates: [] as any[] };

  // Khi Admin/Quản lí/Lễ tân sửa điểm danh gốc từ Vắng -> Có mặt/Muộn,
  // các lịch học bù phát sinh từ lượt vắng sai phải bị hủy theo lỗi nguồn.
  // Không đưa học sinh về Chờ xếp, vì lượt vắng gốc sẽ bị xóa ở bước sau.
  const { data, error } = await supabase
    .from("official_makeup_plans")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .in("absence_id", ids)
    .neq("status", "cancelled")
    .select("id, absence_id, status, cancelled_at");
  if (error) throw error;

  return {
    makeupPlanUpdates: (data || []).map((row: any) => ({
      id: row.id,
      absenceId: row.absence_id,
      status: row.status,
      cancelledAt: row.cancelled_at,
    })),
  };
}


async function createPendingMakeupPlansFromAttendance(supabase: any, user: any, body: any, pendingMakeupPlans: any[]) {
  const items = Array.isArray(pendingMakeupPlans) ? pendingMakeupPlans : [];
  if (!items.length) return { makeupPlansCreated: [] as any[] };
  if (!canManage(user)) throw new Error("Chỉ Admin/Quản lí/Lễ tân được thêm học bù trong màn điểm danh đã đóng");

  const sessionKey = String(body.sessionKey || "");
  const classId = String(body.classId || "");
  const unique = new Map<string, any>();
  for (const raw of items) {
    const absenceId = String(raw?.absenceId || "");
    const studentId = String(raw?.studentId || "");
    const sourceClassId = String(raw?.sourceClassId || "");
    const sourceSessionKey = String(raw?.sourceSessionKey || "");
    const targetClassId = String(raw?.targetClassId || classId);
    const targetSessionKey = String(raw?.targetSessionKey || sessionKey);
    if (!absenceId || !studentId || !sourceClassId || !sourceSessionKey) continue;
    if (targetClassId !== classId || targetSessionKey !== sessionKey) continue;
    if (sourceClassId === classId) continue;
    unique.set(absenceId, {
      id: String(raw?.id || `mk_${Date.now()}_${unique.size}`),
      absenceId,
      studentId,
      sourceClassId,
      sourceSessionKey,
      targetClassId,
      targetSessionKey,
    });
  }
  const plans = [...unique.values()];
  if (!plans.length) return { makeupPlansCreated: [] as any[] };

  const deletedMonths = await deletedSourceMonthSet(supabase, plans.map((p: any) => p.sourceSessionKey));
  if (deletedMonths.size) {
    throw new Error(`Tháng dữ liệu vắng ${Array.from(deletedMonths).join(', ')} đã bị xóa, không thể thêm học bù`);
  }

  const absenceIds = plans.map((p: any) => p.absenceId);
  const { data: absences, error: absenceError } = await supabase
    .from("official_absence_records")
    .select("id,status")
    .in("id", absenceIds);
  if (absenceError) throw absenceError;
  const pendingAbsenceIds = new Set((absences || []).filter((a: any) => String(a.status || "pending") === "pending").map((a: any) => String(a.id)));

  const { data: existingPlans, error: existingError } = await supabase
    .from("official_makeup_plans")
    .select("id,absence_id,status")
    .in("absence_id", absenceIds)
    .neq("status", "cancelled");
  if (existingError) throw existingError;
  const alreadyPlannedAbsenceIds = new Set((existingPlans || []).map((p: any) => String(p.absence_id)));

  const rows = plans
    .filter((p: any) => pendingAbsenceIds.has(p.absenceId) && !alreadyPlannedAbsenceIds.has(p.absenceId))
    .map((p: any) => ({
      id: p.id,
      absence_id: p.absenceId,
      student_id: p.studentId,
      source_class_id: p.sourceClassId,
      source_session_key: p.sourceSessionKey,
      target_class_id: p.targetClassId,
      target_session_key: p.targetSessionKey,
      status: "scheduled",
      created_by: user.id,
    }));

  if (!rows.length) return { makeupPlansCreated: [] as any[] };

  const { data, error } = await supabase
    .from("official_makeup_plans")
    .insert(rows)
    .select("*");
  if (error) throw error;

  const createdAbsenceIds = (data || []).map((p: any) => String(p.absence_id)).filter(Boolean);
  if (createdAbsenceIds.length) {
    const { error: updateError } = await supabase
      .from("official_absence_records")
      .update({ status: "scheduled", updated_at: new Date().toISOString() })
      .in("id", createdAbsenceIds);
    if (updateError) throw updateError;
  }

  return {
    makeupPlansCreated: (data || []).map((p: any) => ({
      id: p.id,
      absenceId: p.absence_id,
      studentId: p.student_id,
      sourceClassId: p.source_class_id,
      sourceSessionKey: p.source_session_key,
      targetClassId: p.target_class_id,
      targetSessionKey: p.target_session_key,
      status: p.status,
      createdBy: p.created_by,
      createdAt: p.created_at,
    })),
  };
}

async function syncMakeupPlansFromAttendance(supabase: any, sessionKey: string, normalizedRows: any[]) {
  const makeupStatusByStudent = new Map(
    normalizedRows
      .filter((r: any) => r.row_type === "makeup")
      .map((r: any) => [String(r.student_id), String(r.status)])
  );

  if (!makeupStatusByStudent.size) {
    return { makeupPlanUpdates: [], makeupAbsenceRecords: [], makeupResolvedAbsenceIds: [] };
  }

  // Lấy tất cả plan thuộc đúng buổi, không chỉ status=scheduled.
  // Như vậy nếu giáo viên/Admin sửa điểm danh từ Vắng học bù -> Có mặt,
  // plan đã từng bị cancelled vẫn được chuyển lại thành completed.
  const makeupStudentIds = [...makeupStatusByStudent.keys()];
  const { data: plans, error: planError } = await supabase
    .from("official_makeup_plans")
    .select("id, absence_id, student_id, status")
    .eq("target_session_key", sessionKey)
    .in("student_id", makeupStudentIds);

  if (planError) throw planError;

  const completedIds: string[] = [];
  const completedAbsenceIds: string[] = [];
  const missed: any[] = [];
  for (const plan of plans || []) {
    const nextStatus = makeupStatusByStudent.get(String(plan.student_id));
    if (nextStatus === "present" || nextStatus === "late") {
      completedIds.push(String(plan.id));
      if (plan.absence_id) completedAbsenceIds.push(String(plan.absence_id));
    }
    if (nextStatus === "absent") missed.push(plan);
  }

  const now = new Date().toISOString();
  const makeupPlanUpdates: any[] = [];
  let makeupResolvedAbsenceIds: string[] = [];

  if (completedIds.length) {
    const { data, error } = await supabase
      .from("official_makeup_plans")
      .update({ status: "completed", cancelled_at: null })
      .in("id", completedIds)
      .select("id, absence_id, status, cancelled_at");
    if (error) throw error;
    for (const row of data || []) {
      makeupPlanUpdates.push({
        id: row.id,
        absenceId: row.absence_id,
        status: row.status,
        cancelledAt: row.cancelled_at,
      });
    }

    if (completedAbsenceIds.length) {
      const uniqueCompletedAbsenceIds = [...new Set(completedAbsenceIds)];
      // official_absence_records hiện chỉ cho phép pending/scheduled/cancelled.
      // Khi học bù đã đến, giữ status=scheduled để không còn nằm trong query Chờ xếp.
      const { error: completeAbsenceError } = await supabase
        .from("official_absence_records")
        .update({ status: "scheduled", updated_at: now })
        .in("id", uniqueCompletedAbsenceIds);
      if (completeAbsenceError) throw completeAbsenceError;
      makeupResolvedAbsenceIds = uniqueCompletedAbsenceIds;
    }
  }

  let makeupAbsenceRecords: any[] = [];
  if (missed.length) {
    const missedIds = missed.map((p: any) => String(p.id));
    const missedAbsenceIds = missed.map((p: any) => String(p.absence_id)).filter(Boolean);

    const { data, error } = await supabase
      .from("official_makeup_plans")
      .update({ status: "cancelled", cancelled_at: now })
      .in("id", missedIds)
      .select("id, absence_id, status, cancelled_at");
    if (error) throw error;
    for (const row of data || []) {
      makeupPlanUpdates.push({
        id: row.id,
        absenceId: row.absence_id,
        status: row.status,
        cancelledAt: row.cancelled_at,
      });
    }

    if (missedAbsenceIds.length) {
      const uniqueMissedAbsenceIds = [...new Set(missedAbsenceIds)];
      const { error: absenceError } = await supabase
        .from("official_absence_records")
        .update({ status: "pending", updated_at: now })
        .in("id", uniqueMissedAbsenceIds);
      if (absenceError) throw absenceError;

      const { data: absences, error: readAbsenceError } = await supabase
        .from("official_absence_records")
        .select("id, student_id, source_class_id, source_session_key, source_session_label, reason, generated_from_attendance, status, created_at, updated_at")
        .in("id", uniqueMissedAbsenceIds);
      if (readAbsenceError) throw readAbsenceError;
      makeupAbsenceRecords = (absences || []).map(mapAbsenceRecord);
    }
  }

  return { makeupPlanUpdates, makeupAbsenceRecords, makeupResolvedAbsenceIds };
}

async function userCanSaveAttendance(user: any, classId: string, body: any) {
  // Không cho bất kỳ vai trò nào lưu điểm danh trước giờ bắt đầu buổi học.
  // Admin/Quản lí/Lễ tân vẫn được sửa ngoài giờ sau khi buổi học đã bắt đầu.
  if (!attendanceStarted(body)) return false;
  if (canManage(user)) return true;
  if (!attendanceWindowOpen(body)) return false;

  const teacher = await teacherForUser(user);
  if (!teacher?.id) return false;

  const supabase = supabaseAdmin();

  const { data: cls, error: ce } = await supabase
    .from("official_classes")
    .select("id, teacher_id, assistant_teacher_id")
    .eq("id", classId)
    .maybeSingle();

  if (ce) throw ce;
  if (String(cls?.teacher_id || "") === String(teacher.id)) return true;
  if (String(cls?.assistant_teacher_id || "") === String(teacher.id)) return true;

  // Also allow a teacher explicitly assigned to a class makeup session.
  const date = validDate(body.date);
  const start = validTime(body.start);
  const end = validTime(body.end);
  if (!date || !start || !end) return false;

  const { data: makeup, error: me } = await supabase
    .from("official_class_makeup_sessions")
    .select("id")
    .eq("class_id", classId)
    .eq("teacher_id", teacher.id)
    .eq("makeup_date", date)
    .neq("status", "cancelled")
    .limit(1);

  if (me) throw me;
  return !!(makeup || []).length;
}


export async function POST(req: NextRequest) {
  const startedAt = performance.now();
  const { user, response } = await requireUser();
  const authFinishedAt = performance.now();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const sessionKey = String(body.sessionKey || "");
  const classId = String(body.classId || "");
  const rows = body.rows || {};
  const manualMakeups = Array.isArray(body.manualMakeups) ? body.manualMakeups : [];
  const pendingMakeupPlans = Array.isArray(body.pendingMakeupPlans) ? body.pendingMakeupPlans : [];

  if (!sessionKey || !classId) {
    return NextResponse.json({ error: "Thiếu thông tin buổi điểm danh" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  let allowed = false;
  try {
    allowed = await userCanSaveAttendance(user, classId, body);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Không kiểm tra được quyền điểm danh" }, { status: 500 });
  }

  if (!allowed) {
    return NextResponse.json({
      error: "Điểm danh chỉ mở từ giờ bắt đầu buổi học. Admin/Quản lí/Lễ tân không được điểm danh trước giờ học, nhưng vẫn có thể sửa ngoài giờ sau khi buổi học đã bắt đầu.",
    }, { status: 403 });
  }

  const permissionFinishedAt = performance.now();
  const normalizedRows = normalizeRows(rows).map((r: any) => ({ ...r, session_key: sessionKey }));
  const officialRows = normalizedRows.filter((r: any) => r.row_type === "official");
  const canManageAttendance = canManage(user);
  const normalizedPendingMakeupPlans = pendingMakeupPlans
    .map((raw: any) => ({
      id: String(raw?.id || ""),
      absence_id: String(raw?.absenceId || ""),
      student_id: String(raw?.studentId || ""),
      source_class_id: String(raw?.sourceClassId || ""),
      source_session_key: String(raw?.sourceSessionKey || ""),
      target_class_id: String(raw?.targetClassId || classId),
      target_session_key: String(raw?.targetSessionKey || sessionKey),
    }))
    .filter((item: any) => item.absence_id && item.student_id);

  // Phase 5B: one RPC keeps the full save atomic and removes the many sequential
  // Supabase round trips used by the legacy implementation. The legacy path remains
  // available only when migration 018 has not been installed yet.
  const rpcStartedAt = performance.now();
  const { data: fastResult, error: fastError } = await supabase.rpc("official_save_attendance_fast", {
    p_session_key: sessionKey,
    p_class_id: classId,
    p_session_date: body.date,
    p_day_key: body.day || null,
    p_start_time: validTime(body.start) || null,
    p_end_time: validTime(body.end) || null,
    p_session_type: body.type === "class_makeup" ? "class_makeup" : "regular",
    p_manual_makeups: manualMakeups,
    p_rows: normalizedRows.map(({ session_key, updated_at, ...row }: any) => row),
    p_pending_makeup_plans: normalizedPendingMakeupPlans,
    p_updated_by: user.id,
    p_can_manage: canManageAttendance,
    p_session_label: body.sessionLabel || sessionLabelFromBody(body),
    p_capacity: Math.max(1, Number(body.capacity || 15)),
  });
  const rpcFinishedAt = performance.now();

  if (!fastError) {
    const result = fastResult || {};
    const finishedAt = performance.now();
    return attendanceResponse({
      ok: true,
      mode: "rpc-fast",
      session: {
        sessionKey,
        saved: true,
        editable: false,
        rows,
        manualMakeups,
        updatedAt: result.updatedAt || new Date().toISOString(),
      },
      absenceRecords: result.absenceRecords || [],
      makeupPlansCreated: result.makeupPlansCreated || [],
      makeupPlanUpdates: result.makeupPlanUpdates || [],
      makeupAbsenceRecords: result.makeupAbsenceRecords || [],
      makeupResolvedAbsenceIds: result.makeupResolvedAbsenceIds || [],
    }, 200, {
      auth: authFinishedAt - startedAt,
      permission: permissionFinishedAt - authFinishedAt,
      rpc: rpcFinishedAt - rpcStartedAt,
      total: finishedAt - startedAt,
    }, "rpc-fast");
  }

  if (!isMissingAttendanceFastRpc(fastError)) {
    const message = fastError.message || "Không lưu được điểm danh";
    const status = /chỉ admin\/quản lí/i.test(message)
      ? 403
      : /đã được xếp học bù|vượt quá sĩ số|bị trùng|không hợp lệ|không còn ở trạng thái|tải lại danh sách/i.test(message)
        ? 409
        : 500;
    return attendanceResponse({ error: message, mode: "rpc-fast" }, status, {
      auth: authFinishedAt - startedAt,
      permission: permissionFinishedAt - authFinishedAt,
      rpc: rpcFinishedAt - rpcStartedAt,
      total: performance.now() - startedAt,
    }, "rpc-fast");
  }

  const legacyStartedAt = performance.now();
  const rowStatusByAbsenceId = new Map(officialRows.map((r: any) => [absenceId(r.student_id, sessionKey), r.status]));

  const { data: existingAbsences, error: existingAbsError } = await supabase
    .from("official_absence_records")
    .select("id, student_id, status, source_session_key, generated_from_attendance")
    .eq("source_session_key", sessionKey)
    .eq("generated_from_attendance", true);

  if (existingAbsError) return NextResponse.json({ error: existingAbsError.message }, { status: 500 });

  const correctedAbsenceIds = (existingAbsences || [])
    .filter((a: any) => {
      const nextStatus = rowStatusByAbsenceId.get(String(a.id));
      return nextStatus && nextStatus !== "absent";
    })
    .map((a: any) => String(a.id));

  let correctedPlanRows: any[] = [];
  if (correctedAbsenceIds.length) {
    const { data: linkedPlans, error: linkedPlanError } = await supabase
      .from("official_makeup_plans")
      .select("id, absence_id, status")
      .in("absence_id", correctedAbsenceIds);
    if (linkedPlanError) return NextResponse.json({ error: linkedPlanError.message }, { status: 500 });
    correctedPlanRows = linkedPlans || [];
  }

  // Giáo viên thường có thể sửa nhầm khi lượt vắng chưa được xếp học bù.
  // Nếu đã từng có makeupPlan liên quan, chỉ Admin/Quản lí/Lễ tân được sửa để hệ thống hủy lịch học bù đúng cách.
  if (correctedPlanRows.length && !canManageAttendance) {
    return NextResponse.json({
      error: "Lượt vắng này đã được xếp học bù. Hãy báo Admin/Quản lí/Lễ tân sửa điểm danh gốc để hệ thống hủy lịch học bù đúng cách.",
    }, { status: 409 });
  }

  let correctionSync = { makeupPlanUpdates: [] as any[] };
  if (canManageAttendance && correctedAbsenceIds.length) {
    try {
      correctionSync = await cancelMakeupPlansForCorrectedAbsences(supabase, correctedAbsenceIds);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Không hủy được lịch học bù khi sửa điểm danh gốc" }, { status: 500 });
    }
  }

  let pendingMakeupSync = { makeupPlansCreated: [] as any[] };
  if (pendingMakeupPlans.length) {
    try {
      pendingMakeupSync = await createPendingMakeupPlansFromAttendance(supabase, user, body, pendingMakeupPlans);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Không thêm được học bù vào điểm danh" }, { status: 500 });
    }
  }

  const sessionRow = {
    session_key: sessionKey,
    class_id: classId,
    session_date: body.date,
    day_key: body.day,
    start_time: body.start,
    end_time: body.end,
    session_type: body.type || "regular",
    saved: true,
    editable: false,
    manual_makeups: manualMakeups,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { error: sessionError } = await supabase
    .from("official_attendance_sessions")
    .upsert(sessionRow, { onConflict: "session_key" });

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  await supabase.from("official_attendance_rows").delete().eq("session_key", sessionKey);

  const rowValues = normalizedRows;

  if (rowValues.length) {
    const { error: rowsError } = await supabase.from("official_attendance_rows").insert(rowValues);
    if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 });
  }

  let makeupSync = { makeupPlanUpdates: [] as any[], makeupAbsenceRecords: [] as any[], makeupResolvedAbsenceIds: [] as string[] };
  try {
    makeupSync = await syncMakeupPlansFromAttendance(supabase, sessionKey, normalizedRows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Không cập nhật được trạng thái học bù" }, { status: 500 });
  }

  const absentRows = officialRows.filter((r: any) => r.status === "absent");
  const existingById = new Map((existingAbsences || []).map((a: any) => [String(a.id), a]));

  const correctedAbsenceIdSet = new Set(canManageAttendance ? correctedAbsenceIds : []);
  const deleteIds = (existingAbsences || [])
    .filter((a: any) => {
      const nextStatus = rowStatusByAbsenceId.get(String(a.id));
      if (nextStatus === "absent") return false;
      const currentStatus = String(a.status || "");
      // Giáo viên thường vẫn không được xóa lượt vắng đã xếp học bù.
      // Admin/Quản lí/Lễ tân sửa điểm danh gốc thì được xóa cả lượt đang scheduled,
      // vì các makeupPlan liên quan đã bị hủy ở trên.
      if (currentStatus === "scheduled" && !correctedAbsenceIdSet.has(String(a.id))) return false;
      return true;
    })
    .map((a: any) => String(a.id));

  if (deleteIds.length) {
    const { error: deleteAbsError } = await supabase
      .from("official_absence_records")
      .delete()
      .eq("source_session_key", sessionKey)
      .eq("generated_from_attendance", true)
      .in("id", deleteIds);
    if (deleteAbsError) return NextResponse.json({ error: deleteAbsError.message }, { status: 500 });
  }

  if (absentRows.length) {
    const absenceRows = absentRows.map((r: any) => {
      const id = absenceId(r.student_id, sessionKey);
      const old = existingById.get(id) as any;
      return {
        id,
        student_id: r.student_id,
        source_class_id: classId,
        source_session_key: sessionKey,
        source_session_label: body.sessionLabel || sessionLabelFromBody(body),
        reason: r.note || old?.reason || "Vắng",
        generated_from_attendance: true,
        status: String(old?.status || "") === "scheduled" ? "scheduled" : "pending",
        updated_at: new Date().toISOString(),
      };
    });

    const { error: absError } = await supabase
      .from("official_absence_records")
      .upsert(absenceRows, { onConflict: "id" });

    if (absError) return NextResponse.json({ error: absError.message }, { status: 500 });
  }

  const { data: absData } = await supabase
    .from("official_absence_records")
    .select("*")
    .eq("source_session_key", sessionKey);

  const finishedAt = performance.now();
  return attendanceResponse({
    ok: true,
    mode: "legacy",
    session: {
      sessionKey,
      saved: true,
      editable: false,
      rows,
      manualMakeups,
      updatedAt: sessionRow.updated_at,
    },
    absenceRecords: (absData || []).map(mapAbsenceRecord),
    makeupPlansCreated: pendingMakeupSync.makeupPlansCreated,
    makeupPlanUpdates: [...correctionSync.makeupPlanUpdates, ...makeupSync.makeupPlanUpdates],
    makeupAbsenceRecords: makeupSync.makeupAbsenceRecords,
    makeupResolvedAbsenceIds: makeupSync.makeupResolvedAbsenceIds,
  }, 200, {
    auth: authFinishedAt - startedAt,
    permission: permissionFinishedAt - authFinishedAt,
    rpcLookup: rpcFinishedAt - rpcStartedAt,
    legacy: finishedAt - legacyStartedAt,
    total: finishedAt - startedAt,
  }, "legacy");
}
