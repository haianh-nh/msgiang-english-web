import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { teacherForUser } from "@/lib/classes";

function monthFromSessionKey(key: any) {
  const parts = String(key || "").split("|");
  const date = parts.length >= 2 ? parts[1] : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : "";
}

function isMissingDeletedMonthsTable(error: any) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return error?.code === "42P01" || msg.includes("official_makeup_deleted_months") || msg.includes("does not exist");
}

function isMissingRpc(error: any, name: string) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return error?.code === "PGRST202" || error?.code === "42883" || (msg.includes(name.toLowerCase()) && (msg.includes("not found") || msg.includes("does not exist")));
}

async function sourceMonthDeleted(supabase: any, sourceSessionKey: any) {
  const month = monthFromSessionKey(sourceSessionKey);
  if (!month) return false;
  const { data, error } = await supabase
    .from("official_makeup_deleted_months")
    .select("month_key")
    .eq("month_key", month)
    .maybeSingle();
  if (error) {
    if (isMissingDeletedMonthsTable(error)) return false;
    throw error;
  }
  return !!data?.month_key;
}

function inactiveClassStatus(v: any) {
  return ["ended", "inactive", "cancelled", "canceled", "deleted", "archived"].includes(String(v || "active").toLowerCase());
}

function targetSessionCanReceiveMakeup(targetSessionKey: string) {
  const parts = String(targetSessionKey || "").split("|");
  if (parts.length < 4) return false;
  const date = parts[1];
  const slot = parts[3] || "";
  const [start] = slot.split("-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start || "")) return false;
  const startAt = new Date(`${date}T${start}:00+07:00`);
  if (!Number.isFinite(startAt.getTime())) return false;
  return Date.now() < startAt.getTime();
}

function mapPlan(r: any) {
  return {
    id: r.id,
    absenceId: r.absence_id,
    studentId: r.student_id,
    sourceClassId: r.source_class_id,
    sourceSessionKey: r.source_session_key,
    targetClassId: r.target_class_id,
    targetSessionKey: r.target_session_key,
    status: r.status,
    createdBy: r.created_by,
    createdAt: r.created_at,
    cancelledAt: r.cancelled_at,
  };
}

function mapAbsence(a: any) {
  if (!a) return null;
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

function rpcStatus(error: any) {
  const msg = String(error?.message || "");
  if (msg.includes("đã bị xóa")) return 409;
  if (msg.includes("Không tìm thấy")) return 404;
  if (error?.code === "P0001") return 400;
  return 500;
}

async function legacySchedule(args: {
  supabase: any;
  body: any;
  user: any;
  targetClassId: string;
  targetSessionKey: string;
  sourceClassId: string;
  studentId: string;
  absenceId: string;
  capacity: number;
}) {
  const { supabase, body, user, targetClassId, targetSessionKey, sourceClassId, studentId, absenceId, capacity } = args;

  const { data: absence, error: ae } = await supabase
    .from("official_absence_records")
    .select("id,student_id,source_class_id,status,source_session_key,source_session_label,reason,generated_from_attendance,created_at,updated_at")
    .eq("id", absenceId)
    .maybeSingle();
  if (ae) throw ae;
  if (!absence?.id) return { error: "Không tìm thấy lượt vắng", status: 404 };
  if (String(absence.student_id) !== studentId || String(absence.source_class_id) !== sourceClassId) {
    return { error: "Thông tin học sinh/lớp vắng không khớp", status: 400 };
  }
  if (String(absence.status || "pending") !== "pending") return { error: "Lượt vắng này đã được xếp học bù", status: 400 };
  if (await sourceMonthDeleted(supabase, absence.source_session_key || body.sourceSessionKey)) {
    return { error: "Tháng dữ liệu vắng này đã bị xóa, không thể xếp học bù", status: 409 };
  }

  const [existingAbsencePlanRes, officialCountRes, makeupCountRes, existingTargetRes] = await Promise.all([
    supabase.from("official_makeup_plans").select("id,status").eq("absence_id", absenceId).neq("status", "cancelled").maybeSingle(),
    supabase.from("official_students").select("id", { count: "exact", head: true }).eq("class_id", targetClassId).eq("status", "active"),
    supabase.from("official_makeup_plans").select("id", { count: "exact", head: true }).eq("target_session_key", targetSessionKey).eq("status", "scheduled"),
    supabase.from("official_makeup_plans").select("id,status").eq("target_session_key", targetSessionKey).eq("student_id", studentId).eq("status", "scheduled").maybeSingle(),
  ]);

  for (const res of [existingAbsencePlanRes, officialCountRes, makeupCountRes, existingTargetRes]) {
    if (res.error) throw res.error;
  }
  if (existingAbsencePlanRes.data?.id) return { error: "Lượt vắng này đã được xếp học bù", status: 400 };
  if (existingTargetRes.data?.id) return { error: "Học sinh đã có trong buổi học bù này", status: 400 };

  const officialCount = officialCountRes.count || 0;
  const makeupCount = makeupCountRes.count || 0;
  if (officialCount + makeupCount >= capacity) return { error: `Buổi này đã đủ ${capacity} học sinh`, status: 400 };

  const id = String(body.id || `mk_${Date.now()}`);
  const { data: plan, error: insertError } = await supabase
    .from("official_makeup_plans")
    .insert({
      id,
      absence_id: absenceId,
      student_id: studentId,
      source_class_id: sourceClassId,
      source_session_key: body.sourceSessionKey || absence.source_session_key || null,
      target_class_id: targetClassId,
      target_session_key: targetSessionKey,
      status: "scheduled",
      created_by: user.id,
    })
    .select("*")
    .single();
  if (insertError) throw insertError;

  const { data: updatedAbsence, error: updateError } = await supabase
    .from("official_absence_records")
    .update({ status: "scheduled", updated_at: new Date().toISOString() })
    .eq("id", absenceId)
    .select("*")
    .single();
  if (updateError) throw updateError;

  return {
    ok: true,
    plan: mapPlan(plan),
    absenceRecord: mapAbsence(updatedAbsence),
    counts: { official: officialCount, makeup: makeupCount + 1, total: officialCount + makeupCount + 1, capacity },
    mode: "legacy",
  };
}

export async function POST(req: NextRequest) {
  const started = performance.now();
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const targetClassId = String(body.targetClassId || "");
  const targetSessionKey = String(body.targetSessionKey || "");
  const rawBatchItems = Array.isArray(body.items) ? body.items : null;
  const rawCancelPlanIds = Array.isArray(body.cancelPlanIds) ? body.cancelPlanIds : null;
  const cancelPlanIds = (rawCancelPlanIds || []).slice(0, 51).map((id: any) => String(id || "")).filter(Boolean);
  const isChangeSet = rawCancelPlanIds !== null;
  const isBatch = !!rawBatchItems || isChangeSet;
  const batchItems = (rawBatchItems || []).slice(0, 51).map((item: any, index: number) => ({
    id: String(item?.id || `mk_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`),
    absenceId: String(item?.absenceId || ""),
    studentId: String(item?.studentId || ""),
    sourceClassId: String(item?.sourceClassId || ""),
    sourceSessionKey: String(item?.sourceSessionKey || ""),
  }));

  const singleItem = {
    id: String(body.id || `mk_${Date.now()}`),
    absenceId: String(body.absenceId || ""),
    studentId: String(body.studentId || ""),
    sourceClassId: String(body.sourceClassId || ""),
    sourceSessionKey: String(body.sourceSessionKey || ""),
  };
  const items = isBatch ? batchItems : [singleItem];

  if (!targetClassId || !targetSessionKey || (!items.length && !cancelPlanIds.length)) {
    return NextResponse.json({ error: "Thiếu thông tin xếp học bù" }, { status: 400 });
  }
  if (items.length > 50) {
    return NextResponse.json({ error: "Chỉ được xác nhận tối đa 50 học sinh mỗi lần" }, { status: 400 });
  }
  if (cancelPlanIds.length > 50) {
    return NextResponse.json({ error: "Chỉ được hủy tối đa 50 học sinh mỗi lần" }, { status: 400 });
  }
  if (new Set(cancelPlanIds).size !== cancelPlanIds.length) {
    return NextResponse.json({ error: "Danh sách hủy có lịch học bù bị trùng" }, { status: 400 });
  }
  if (items.some((item: any) => !item.absenceId || !item.studentId || !item.sourceClassId)) {
    return NextResponse.json({ error: "Có học sinh thiếu thông tin xếp học bù" }, { status: 400 });
  }
  if (items.some((item: any) => item.sourceClassId === targetClassId)) {
    return NextResponse.json({ error: "Học sinh đã thuộc lớp này, không cần xếp học bù vào chính lớp gốc" }, { status: 400 });
  }
  if (new Set(items.map((item: any) => item.absenceId)).size !== items.length) {
    return NextResponse.json({ error: "Danh sách xác nhận có lượt vắng bị trùng" }, { status: 400 });
  }
  if (new Set(items.map((item: any) => item.studentId)).size !== items.length) {
    return NextResponse.json({ error: "Một học sinh chỉ được xếp một lượt vắng vào cùng buổi" }, { status: 400 });
  }
  if (items.length && !targetSessionCanReceiveMakeup(targetSessionKey)) {
    return NextResponse.json({ error: canManage(user) ? "Buổi đã điểm danh: hãy mở màn điểm danh để thêm học bù rồi lưu lại" : "Chỉ được xếp học bù trước giờ học" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const teacherPromise = canManage(user) ? Promise.resolve(null) : teacherForUser(user);
  const classIds = [...new Set([targetClassId, ...items.map((item: any) => item.sourceClassId)])];
  const [classesRes, settings, teacher] = await Promise.all([
    supabase
      .from("official_classes")
      .select("id,name,status,teacher_id,assistant_teacher_id")
      .in("id", classIds),
    getSettings(),
    teacherPromise,
  ]);

  if (classesRes.error) return NextResponse.json({ error: classesRes.error.message }, { status: 500 });
  const classes = classesRes.data || [];
  const targetClass = classes.find((c: any) => String(c.id) === targetClassId);
  if (!targetClass || items.some((item: any) => !classes.some((c: any) => String(c.id) === item.sourceClassId))) {
    return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
  }
  if (inactiveClassStatus(targetClass.status)) {
    return NextResponse.json({ error: "Không thể xếp học bù vào lớp đã kết thúc hoặc đã hủy" }, { status: 400 });
  }

  if (!canManage(user)) {
    const me = String(teacher?.id || "");
    if (!me || (String(targetClass.teacher_id || "") !== me && String(targetClass.assistant_teacher_id || "") !== me)) {
      return NextResponse.json({ error: "Không có quyền xếp học bù vào lớp này" }, { status: 403 });
    }
  }

  const capacity = Math.max(1, Number(settings.session_capacity || 15));
  const rpcStarted = performance.now();

  if (isChangeSet) {
    const rpc = await supabase.rpc("official_apply_makeup_plan_changes", {
      p_add_items: items,
      p_cancel_plan_ids: cancelPlanIds,
      p_target_class_id: targetClassId,
      p_target_session_key: targetSessionKey,
      p_created_by: user.id,
      p_capacity: capacity,
    });

    if (!rpc.error) {
      const payload = {
        ok: true,
        plans: (rpc.data?.plans || []).map(mapPlan),
        cancelledPlans: (rpc.data?.cancelledPlans || []).map(mapPlan),
        absenceRecords: (rpc.data?.absenceRecords || []).map(mapAbsence),
        counts: rpc.data?.counts || null,
        mode: "rpc-changes",
      };
      const res = NextResponse.json(payload);
      res.headers.set("Cache-Control", "private, no-store");
      res.headers.set("Server-Timing", `rpc;dur=${(performance.now() - rpcStarted).toFixed(1)},total;dur=${(performance.now() - started).toFixed(1)}`);
      return res;
    }

    if (!isMissingRpc(rpc.error, "official_apply_makeup_plan_changes")) {
      return NextResponse.json({ error: rpc.error.message || "Không lưu được thay đổi học bù" }, { status: rpcStatus(rpc.error) });
    }

    if (cancelPlanIds.length) {
      return NextResponse.json(
        { error: "Chưa cài migration 016 để lưu thêm và hủy học bù trong cùng một lần" },
        { status: 503 },
      );
    }
    // Không có lượt hủy: tiếp tục dùng RPC batch cũ để tương thích trong lúc triển khai migration 016.
  }

  if (isBatch) {
    const rpc = await supabase.rpc("official_schedule_makeup_plans_batch", {
      p_items: items,
      p_target_class_id: targetClassId,
      p_target_session_key: targetSessionKey,
      p_created_by: user.id,
      p_capacity: capacity,
    });

    let payload: any;
    if (!rpc.error) {
      payload = {
        ok: true,
        plans: (rpc.data?.plans || []).map(mapPlan),
        absenceRecords: (rpc.data?.absenceRecords || []).map(mapAbsence),
        counts: rpc.data?.counts || null,
        mode: "rpc-batch",
      };
    } else if (isMissingRpc(rpc.error, "official_schedule_makeup_plans_batch")) {
      if (items.length !== 1) {
        return NextResponse.json(
          { error: "Chưa cài migration 015 để xác nhận nhiều học sinh cùng lúc" },
          { status: 503 },
        );
      }
      const item = items[0];
      const singleRpc = await supabase.rpc("official_schedule_makeup_plan", {
        p_id: item.id,
        p_absence_id: item.absenceId,
        p_student_id: item.studentId,
        p_source_class_id: item.sourceClassId,
        p_source_session_key: item.sourceSessionKey,
        p_target_class_id: targetClassId,
        p_target_session_key: targetSessionKey,
        p_created_by: user.id,
        p_capacity: capacity,
      });
      if (singleRpc.error) {
        return NextResponse.json({ error: singleRpc.error.message || "Không xếp được học bù" }, { status: rpcStatus(singleRpc.error) });
      }
      payload = {
        ok: true,
        plans: [mapPlan(singleRpc.data?.plan)],
        absenceRecords: [mapAbsence(singleRpc.data?.absenceRecord)].filter(Boolean),
        counts: singleRpc.data?.counts || null,
        mode: "rpc-single-fallback",
      };
    } else {
      return NextResponse.json({ error: rpc.error.message || "Không xếp được học bù" }, { status: rpcStatus(rpc.error) });
    }

    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "private, no-store");
    res.headers.set("Server-Timing", `rpc;dur=${(performance.now() - rpcStarted).toFixed(1)},total;dur=${(performance.now() - started).toFixed(1)}`);
    return res;
  }

  const item = items[0];
  const rpc = await supabase.rpc("official_schedule_makeup_plan", {
    p_id: item.id,
    p_absence_id: item.absenceId,
    p_student_id: item.studentId,
    p_source_class_id: item.sourceClassId,
    p_source_session_key: item.sourceSessionKey,
    p_target_class_id: targetClassId,
    p_target_session_key: targetSessionKey,
    p_created_by: user.id,
    p_capacity: capacity,
  });

  let payload: any;
  if (!rpc.error) {
    payload = {
      ok: true,
      plan: mapPlan(rpc.data?.plan),
      absenceRecord: mapAbsence(rpc.data?.absenceRecord),
      counts: rpc.data?.counts || null,
      mode: "rpc",
    };
  } else if (isMissingRpc(rpc.error, "official_schedule_makeup_plan")) {
    try {
      payload = await legacySchedule({
        supabase,
        body: { ...body, ...item },
        user,
        targetClassId,
        targetSessionKey,
        sourceClassId: item.sourceClassId,
        studentId: item.studentId,
        absenceId: item.absenceId,
        capacity,
      });
      if (payload?.error) return NextResponse.json({ error: payload.error }, { status: payload.status || 400 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Không xếp được học bù" }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: rpc.error.message || "Không xếp được học bù" }, { status: rpcStatus(rpc.error) });
  }

  const res = NextResponse.json(payload);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Server-Timing", `rpc;dur=${(performance.now() - rpcStarted).toFixed(1)},total;dur=${(performance.now() - started).toFixed(1)}`);
  return res;
}
