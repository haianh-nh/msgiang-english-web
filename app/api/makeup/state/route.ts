import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function validMonth(v: string | null) {
  const s = String(v || "");
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  return new Date().toISOString().slice(0, 7);
}

function attendanceKey(sessionKey: string) {
  return `att_${sessionKey}`;
}

function sessionKeyMonthLike(monthKey: string) {
  // Session key format: classId|YYYY-MM-DD|Day|HH:mm-HH:mm
  return `%|${monthKey}-%`;
}

function mapAbsence(a: any) {
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

function isMissingDeletedMonthsTable(error: any) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return error?.code === "42P01" || msg.includes("official_makeup_deleted_months") || msg.includes("does not exist");
}


async function deletedMonthState(supabase: any) {
  const { data, error } = await supabase
    .from("official_makeup_deleted_months")
    .select("month_key,reason,deleted_at")
    .order("month_key", { ascending: false });
  if (error) {
    // If the optional month-control table has not been created yet, keep Hoc bu and tutoring usable.
    // The delete-month button will work after running migration 013.
    if (isMissingDeletedMonthsTable(error)) return { deletedMonths: [], deletedRows: [] };
    throw error;
  }
  const deletedMonths = Array.from(new Set((data || []).map((r: any) => String(r.month_key || "")).filter(Boolean)));
  return { deletedMonths, deletedRows: data || [] };
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

function mapSupportClass(c: any, teacherMap: Map<string, any>) {
  const teacher = teacherMap.get(String(c.teacher_id || ""));
  const assistant = teacherMap.get(String(c.assistant_teacher_id || ""));
  return {
    id: c.id,
    name: c.name,
    teacher: teacher?.name || "",
    teacherId: c.teacher_id || null,
    taId: c.assistant_teacher_id || null,
    ta: assistant?.name || c.assistant_name || "",
    time: "",
    month: "",
    students: [],
    status: c.status || "active",
    startDate: c.start_date || "",
    endDate: c.end_date || "",
    createdAt: c.created_at || "",
    grade: c.grade || "",
    note: c.note || "",
  };
}

export async function GET(req: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const url = new URL(req.url);
  const month = validMonth(url.searchParams.get("month"));
  const supabase = supabaseAdmin();

  let deletedState: any = { deletedMonths: [], deletedRows: [] };
  try {
    deletedState = await deletedMonthState(supabase);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Không kiểm tra được tháng đã xóa" }, { status: 500 });
  }
  if (deletedState.deletedMonths.includes(month)) {
    return NextResponse.json({ ok: true, month, deleted: true, deletedMonths: deletedState.deletedMonths, deletedRows: deletedState.deletedRows, attendanceSessions: {}, absenceRecords: [], makeupPlans: [], supportClasses: [] });
  }

  // API riêng cho tab Học bù: chỉ kéo dữ liệu của tháng đang xem.
  // Lấy absence trước rồi lấy plan theo cả source_session_key và absence_id.
  // Lý do: một số plan cũ/edge-case có thể thiếu source_session_key; nếu chỉ lọc source key
  // thì bảng Đã xếp/Đã học bù sẽ bị thiếu dù lượt vắng gốc vẫn thuộc tháng này.
  const absRes = await supabase
    .from("official_absence_records")
    .select("id, student_id, source_class_id, source_session_key, source_session_label, reason, generated_from_attendance, status, created_at, updated_at")
    .like("source_session_key", sessionKeyMonthLike(month))
    .order("created_at", { ascending: true });

  if (absRes.error) return NextResponse.json({ error: absRes.error.message }, { status: 500 });

  const absenceIds = Array.from(new Set((absRes.data || []).map((a: any) => String(a.id || "")).filter(Boolean)));

  const planBySessionRes = await supabase
    .from("official_makeup_plans")
    .select("id, absence_id, student_id, source_class_id, source_session_key, target_class_id, target_session_key, status, created_by, created_at, cancelled_at")
    .or(`source_session_key.like.%|${month}-%,target_session_key.like.%|${month}-%`)
    .order("created_at", { ascending: false });

  if (planBySessionRes.error) return NextResponse.json({ error: planBySessionRes.error.message }, { status: 500 });

  let planByAbsenceData: any[] = [];
  if (absenceIds.length) {
    const planByAbsenceRes = await supabase
      .from("official_makeup_plans")
      .select("id, absence_id, student_id, source_class_id, source_session_key, target_class_id, target_session_key, status, created_by, created_at, cancelled_at")
      .in("absence_id", absenceIds)
      .order("created_at", { ascending: false });
    if (planByAbsenceRes.error) return NextResponse.json({ error: planByAbsenceRes.error.message }, { status: 500 });
    planByAbsenceData = planByAbsenceRes.data || [];
  }

  const planMap = new Map<string, any>();
  for (const p of [...(planBySessionRes.data || []), ...planByAbsenceData]) {
    if (p?.id) planMap.set(String(p.id), p);
  }
  const plans = Array.from(planMap.values()).sort((a: any, b: any) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  const targetSessionKeys = Array.from(new Set(plans.map((p: any) => String(p.target_session_key || "")).filter(Boolean)));

  const supportClassIds = Array.from(new Set([
    ...(absRes.data || []).map((a: any) => String(a.source_class_id || "")),
    ...plans.map((p: any) => String(p.source_class_id || "")),
    ...plans.map((p: any) => String(p.target_class_id || "")),
  ].filter(Boolean)));

  let supportClasses: any[] = [];
  if (supportClassIds.length) {
    const classRes = await supabase
      .from("official_classes")
      .select("id,name,grade,teacher_id,assistant_teacher_id,assistant_name,start_date,end_date,status,note,created_at")
      .in("id", supportClassIds);
    if (classRes.error) return NextResponse.json({ error: classRes.error.message }, { status: 500 });

    const teacherIds = Array.from(new Set((classRes.data || []).flatMap((c: any) => [String(c.teacher_id || ""), String(c.assistant_teacher_id || "")]).filter(Boolean)));
    let teacherMap = new Map<string, any>();
    if (teacherIds.length) {
      const teacherRes = await supabase.from("official_teachers").select("id,name").in("id", teacherIds);
      if (teacherRes.error) return NextResponse.json({ error: teacherRes.error.message }, { status: 500 });
      teacherMap = new Map((teacherRes.data || []).map((t: any) => [String(t.id), t]));
    }
    supportClasses = (classRes.data || []).map((c: any) => mapSupportClass(c, teacherMap));
  }

  let attendanceSessions: Record<string, any> = {};
  if (targetSessionKeys.length) {
    const [sessionRes, rowRes] = await Promise.all([
      supabase
        .from("official_attendance_sessions")
        .select("session_key, session_date, saved, editable, manual_makeups, updated_at")
        .in("session_key", targetSessionKeys),
      supabase
        .from("official_attendance_rows")
        .select("session_key, student_id, row_type, status, note")
        .in("session_key", targetSessionKeys),
    ]);

    if (sessionRes.error) return NextResponse.json({ error: sessionRes.error.message }, { status: 500 });
    if (rowRes.error) return NextResponse.json({ error: rowRes.error.message }, { status: 500 });

    const rowsBySession = new Map<string, any[]>();
    for (const r of rowRes.data || []) {
      const arr = rowsBySession.get(r.session_key) || [];
      arr.push(r);
      rowsBySession.set(r.session_key, arr);
    }

    for (const s of sessionRes.data || []) {
      const rows: Record<string, any> = {};
      for (const r of rowsBySession.get(s.session_key) || []) {
        rows[`${r.row_type}_${r.student_id}`] = {
          studentId: r.student_id,
          type: r.row_type,
          status: r.status,
          note: r.note || "",
        };
      }
      attendanceSessions[attendanceKey(s.session_key)] = {
        sessionKey: s.session_key,
        saved: !!s.saved,
        editable: !!s.editable,
        rows,
        manualMakeups: Array.isArray(s.manual_makeups) ? s.manual_makeups : [],
        updatedAt: s.updated_at,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    month,
    attendanceSessions,
    absenceRecords: (absRes.data || []).map(mapAbsence),
    deleted: false,
    deletedMonths: deletedState.deletedMonths,
    deletedRows: deletedState.deletedRows,
    makeupPlans: plans.map(mapPlan),
    supportClasses,
  });
}
