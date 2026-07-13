import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage, hasRole } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { teacherForUser } from "@/lib/classes";

const DAY_BY_DATE = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function validDate(v: any) {
  const s = String(v || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function validTime(v: any) {
  const s = String(v || "").trim().slice(0, 5);
  return /^\d{2}:\d{2}$/.test(s) ? s : "";
}

function parseYmdUtc(date: string) {
  const [y, m, d] = String(date || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function dayKeyFromDate(date: string) {
  // IMPORTANT: the selected date is a Vietnam calendar date, not an instant.
  // Do not parse it with +07 and then call getDay(), because Vercel runs in UTC
  // and dates around midnight can shift to the previous day.
  const d = parseYmdUtc(date);
  return d ? (DAY_BY_DATE[d.getUTCDay()] || "Mon") : "Mon";
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

async function safeMonthDeleted(supabase: any, monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(String(monthKey || ""))) return false;
  const { data, error } = await supabase
    .from("official_makeup_deleted_months")
    .select("month_key")
    .eq("month_key", monthKey)
    .maybeSingle();
  if (error) {
    // Older deployments may not have the month-control table yet.
    // Creating tutoring classes must still work; the delete-month feature will be enabled after the SQL migration is run.
    if (isMissingDeletedMonthsTable(error)) return false;
    throw error;
  }
  return !!data?.month_key;
}

async function cleanupFailedTutoringCreate(supabase: any, ids: { classId?: string; classMakeupId?: string; planIds?: string[] }) {
  const planIds = (ids.planIds || []).filter(Boolean);
  if (planIds.length) await supabase.from("official_makeup_plans").delete().in("id", planIds);
  if (ids.classMakeupId) await supabase.from("official_class_makeup_sessions").delete().eq("id", ids.classMakeupId);
  if (ids.classId) await supabase.from("official_classes").delete().eq("id", ids.classId);
}

function mapPlan(p: any) {
  return {
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
    cancelledAt: p.cancelled_at,
  };
}

function mapClassMakeup(row: any, teacherName = "", assistantName = "") {
  return {
    id: row.id,
    classId: row.class_id,
    sourceSessionKey: row.source_session_key,
    teacherId: row.teacher_id || null,
    assistantTeacherId: row.assistant_teacher_id || null,
    teacher: teacherName,
    ta: assistantName,
    date: row.makeup_date,
    day: row.day_key,
    start: String(row.start_time || "").slice(0, 5),
    end: String(row.end_time || "").slice(0, 5),
    reason: row.reason || "Lớp học kèm",
    sessionKind: row.session_kind || (String(row.source_session_key||"").startsWith("tutoring:") ? "tutoring" : "class_makeup"),
    className: row.class_name || "",
    classSnapshot: row.classSnapshot || null,
    status: row.status || "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  const teachingUser = hasRole(user, "teacher") || hasRole(user, "ta");
  if (!canManage(user) && !teachingUser) {
    return NextResponse.json({ error: "Không có quyền tạo lớp học kèm" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const date = validDate(body.date);
  const start = validTime(body.start);
  const end = validTime(body.end);
  const absenceIds = Array.isArray(body.absenceIds) ? body.absenceIds.map((x: any) => String(x || "").trim()).filter(Boolean) : [];
  let teacherId = String(body.teacherId || "").trim();
  const assistantTeacherId = String(body.assistantTeacherId || body.taId || "").trim() || null;

  if (!name) return NextResponse.json({ error: "Nhập tên lớp học kèm" }, { status: 400 });
  if (!date || !start || !end || start >= end) return NextResponse.json({ error: "Ngày hoặc thời gian học không hợp lệ" }, { status: 400 });
  if (!absenceIds.length) return NextResponse.json({ error: "Chọn ít nhất một học sinh chờ học bù" }, { status: 400 });

  const supabase = supabaseAdmin();
  if (!canManage(user)) {
    const me = await teacherForUser(user);
    if (!me?.id) return NextResponse.json({ error: "Tài khoản chưa liên kết giáo viên" }, { status: 403 });
    teacherId = String(me.id);
  }
  if (!teacherId) return NextResponse.json({ error: "Chọn giáo viên dạy" }, { status: 400 });

  const { data: absences, error: absError } = await supabase
    .from("official_absence_records")
    .select("id, student_id, source_class_id, source_session_key, source_session_label, status")
    .in("id", absenceIds);
  if (absError) return NextResponse.json({ error: absError.message }, { status: 500 });

  const found = absences || [];
  if (found.length !== absenceIds.length) return NextResponse.json({ error: "Có lượt vắng không còn tồn tại" }, { status: 409 });
  const months = Array.from(new Set(found.map((a: any) => monthFromSessionKey(a.source_session_key)).filter(Boolean)));
  if (months.length !== 1) return NextResponse.json({ error: "Chỉ chọn học sinh cùng một tháng học bù" }, { status: 400 });

  let isDeleted = false;
  try {
    isDeleted = await safeMonthDeleted(supabase, String(months[0] || ""));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Không kiểm tra được tháng đã xóa" }, { status: 500 });
  }
  if (isDeleted) return NextResponse.json({ error: "Tháng này đã bị xóa dữ liệu vắng, không thể xếp học bù" }, { status: 409 });

  const pending = found.filter((a: any) => String(a.status || "pending") === "pending");
  if (pending.length !== found.length) return NextResponse.json({ error: "Có học sinh không còn ở trạng thái Chờ xếp" }, { status: 409 });

  const { data: existingPlans, error: existingError } = await supabase
    .from("official_makeup_plans")
    .select("absence_id,status")
    .in("absence_id", absenceIds)
    .neq("status", "cancelled");
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if ((existingPlans || []).length) return NextResponse.json({ error: "Có lượt vắng đã được xếp học bù" }, { status: 409 });

  const { data: teacher } = await supabase.from("official_teachers").select("id,name").eq("id", teacherId).maybeSingle();
  const { data: assistant } = assistantTeacherId
    ? await supabase.from("official_teachers").select("id,name").eq("id", assistantTeacherId).maybeSingle()
    : ({ data: null } as any);

  let createdClassId = "";
  let createdClassMakeupId = "";
  let createdPlanIds: string[] = [];

  try {
    const { data: klass, error: classError } = await supabase
      .from("official_classes")
      .insert({
        name,
        grade: "Học kèm",
        teacher_id: teacherId,
        assistant_teacher_id: assistantTeacherId,
        start_date: date,
        end_date: date,
        status: "active",
        note: "__tutoring_session__",
      })
      .select("id,name,teacher_id,assistant_teacher_id,status,start_date,end_date,created_at")
      .single();
    if (classError) throw classError;
    createdClassId = String(klass.id);

    const day = dayKeyFromDate(date);
    const sourceSessionKey = `tutoring:${klass.id}`;
    const targetSessionKey = `${klass.id}|${date}|${day}|${start}-${end}`;

    const { data: cm, error: cmError } = await supabase
      .from("official_class_makeup_sessions")
      .insert({
        source_session_key: sourceSessionKey,
        class_id: klass.id,
        teacher_id: teacherId,
        makeup_date: date,
        day_key: day,
        start_time: start,
        end_time: end,
        reason: name,
        status: "active",
        created_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select("id, class_id, source_session_key, teacher_id, makeup_date, day_key, start_time, end_time, reason, status, created_at, updated_at")
      .single();
    if (cmError) throw cmError;
    createdClassMakeupId = String(cm.id);

    const planRows = found.map((a: any, i: number) => ({
      id: `tutor_${klass.id}_${i}_${a.student_id}`,
      absence_id: a.id,
      student_id: a.student_id,
      source_class_id: a.source_class_id,
      source_session_key: a.source_session_key,
      target_class_id: klass.id,
      target_session_key: targetSessionKey,
      status: "scheduled",
      created_by: user.id,
    }));
    createdPlanIds = planRows.map((p: any) => String(p.id));

    const { data: plans, error: planError } = await supabase
      .from("official_makeup_plans")
      .insert(planRows)
      .select("*");
    if (planError) throw planError;

    const { error: updateAbsError } = await supabase
      .from("official_absence_records")
      .update({ status: "scheduled", updated_at: new Date().toISOString() })
      .in("id", absenceIds);
    if (updateAbsError) throw updateAbsError;

    const classMakeup = mapClassMakeup({ ...cm, class_name: name, classSnapshot: {
      id: klass.id,
      name,
      teacher: teacher?.name || "",
      teacherId,
      taId: assistantTeacherId,
      ta: assistant?.name || "",
      students: [],
      status: "active",
      startDate: date,
      endDate: date,
      grade: "Học kèm",
      note: "__tutoring_session__",
    } }, teacher?.name || "", assistant?.name || "");

    return NextResponse.json({
      ok: true,
      classMakeup,
      makeupPlans: (plans || []).map(mapPlan),
      targetSessionKey,
    });
  } catch (e: any) {
    await cleanupFailedTutoringCreate(supabase, { classId: createdClassId, classMakeupId: createdClassMakeupId, planIds: createdPlanIds });
    const msg = String(e?.message || "Không tạo được lớp học kèm");
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ error: "Tên lớp học kèm đã tồn tại. Hãy đổi tên lớp khác." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
