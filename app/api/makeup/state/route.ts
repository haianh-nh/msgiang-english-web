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

function relationOne(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

function mapSupportClass(c: any) {
  const teacher = relationOne(c.official_teachers || c.teacher);
  const assistant = relationOne(c.official_assistant_teacher || c.assistant_teacher);
  return {
    id: c.id,
    name: c.name,
    teacher: c.teacher_name || teacher?.name || "",
    teacherId: c.teacher_id || null,
    taId: c.assistant_teacher_id || null,
    ta: c.assistant_teacher_name || assistant?.name || c.assistant_name || "",
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

function isMissingDeletedMonthsTable(error: any) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return error?.code === "42P01" || msg.includes("official_makeup_deleted_months") || msg.includes("does not exist");
}

function isMissingRpc(error: any, name: string) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return error?.code === "PGRST202" || error?.code === "42883" || (msg.includes(name.toLowerCase()) && (msg.includes("not found") || msg.includes("does not exist")));
}

function buildAttendanceSessions(sessions: any[] = []) {
  const out: Record<string, any> = {};
  for (const s of sessions || []) {
    const rows: Record<string, any> = {};
    for (const r of s.rows || []) {
      rows[`${r.row_type}_${r.student_id}`] = {
        studentId: r.student_id,
        type: r.row_type,
        status: r.status,
        note: r.note || "",
      };
    }
    out[attendanceKey(s.session_key)] = {
      sessionKey: s.session_key,
      saved: !!s.saved,
      editable: !!s.editable,
      rows,
      manualMakeups: Array.isArray(s.manual_makeups) ? s.manual_makeups : [],
      updatedAt: s.updated_at,
    };
  }
  return out;
}

async function deletedMonthState(supabase: any) {
  const { data, error } = await supabase
    .from("official_makeup_deleted_months")
    .select("month_key,reason,deleted_at")
    .order("month_key", { ascending: false });
  if (error) {
    if (isMissingDeletedMonthsTable(error)) return { deletedMonths: [], deletedRows: [] };
    throw error;
  }
  const deletedMonths = Array.from(new Set((data || []).map((r: any) => String(r.month_key || "")).filter(Boolean)));
  return { deletedMonths, deletedRows: data || [] };
}

async function legacyMonthState(supabase: any, month: string) {
  const [deletedState, absRes, planBySessionRes] = await Promise.all([
    deletedMonthState(supabase),
    supabase
      .from("official_absence_records")
      .select("id,student_id,source_class_id,source_session_key,source_session_label,reason,generated_from_attendance,status,created_at,updated_at")
      .like("source_session_key", sessionKeyMonthLike(month))
      .order("created_at", { ascending: true }),
    supabase
      .from("official_makeup_plans")
      .select("id,absence_id,student_id,source_class_id,source_session_key,target_class_id,target_session_key,status,created_by,created_at,cancelled_at")
      .or(`source_session_key.like.%|${month}-%,target_session_key.like.%|${month}-%`)
      .order("created_at", { ascending: false }),
  ]);

  if (absRes.error) throw absRes.error;
  if (planBySessionRes.error) throw planBySessionRes.error;
  if (deletedState.deletedMonths.includes(month)) {
    return {
      deleted: true,
      deletedMonths: deletedState.deletedMonths,
      deletedRows: deletedState.deletedRows,
      availableMonths: [],
      absenceRecords: [],
      makeupPlans: [],
      supportClasses: [],
      attendanceSessions: {},
    };
  }

  const absenceIds = Array.from(new Set((absRes.data || []).map((a: any) => String(a.id || "")).filter(Boolean)));
  let planByAbsenceData: any[] = [];
  if (absenceIds.length) {
    const byAbsence = await supabase
      .from("official_makeup_plans")
      .select("id,absence_id,student_id,source_class_id,source_session_key,target_class_id,target_session_key,status,created_by,created_at,cancelled_at")
      .in("absence_id", absenceIds)
      .order("created_at", { ascending: false });
    if (byAbsence.error) throw byAbsence.error;
    planByAbsenceData = byAbsence.data || [];
  }

  const planMap = new Map<string, any>();
  for (const p of [...(planBySessionRes.data || []), ...planByAbsenceData]) if (p?.id) planMap.set(String(p.id), p);
  const plans = Array.from(planMap.values()).sort((a: any, b: any) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  const targetSessionKeys = Array.from(new Set(plans.map((p: any) => String(p.target_session_key || "")).filter(Boolean)));
  const supportClassIds = Array.from(new Set([
    ...(absRes.data || []).map((a: any) => String(a.source_class_id || "")),
    ...plans.map((p: any) => String(p.source_class_id || "")),
    ...plans.map((p: any) => String(p.target_class_id || "")),
  ].filter(Boolean)));

  const [classRes, sessionRes, rowRes] = await Promise.all([
    supportClassIds.length
      ? supabase
          .from("official_classes")
          .select("id,name,grade,teacher_id,assistant_teacher_id,assistant_name,start_date,end_date,status,note,created_at,official_teachers:teacher_id(id,name),official_assistant_teacher:assistant_teacher_id(id,name)")
          .in("id", supportClassIds)
      : Promise.resolve({ data: [], error: null } as any),
    targetSessionKeys.length
      ? supabase.from("official_attendance_sessions").select("session_key,session_date,saved,editable,manual_makeups,updated_at").in("session_key", targetSessionKeys)
      : Promise.resolve({ data: [], error: null } as any),
    targetSessionKeys.length
      ? supabase.from("official_attendance_rows").select("session_key,student_id,row_type,status,note").in("session_key", targetSessionKeys)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (classRes.error) throw classRes.error;
  if (sessionRes.error) throw sessionRes.error;
  if (rowRes.error) throw rowRes.error;

  const rowsBySession = new Map<string, any[]>();
  for (const r of rowRes.data || []) {
    const arr = rowsBySession.get(r.session_key) || [];
    arr.push(r);
    rowsBySession.set(r.session_key, arr);
  }
  const attendanceRows = (sessionRes.data || []).map((s: any) => ({ ...s, rows: rowsBySession.get(s.session_key) || [] }));

  return {
    deleted: false,
    deletedMonths: deletedState.deletedMonths,
    deletedRows: deletedState.deletedRows,
    availableMonths: [],
    absenceRecords: (absRes.data || []).map(mapAbsence),
    makeupPlans: plans.map(mapPlan),
    supportClasses: (classRes.data || []).map(mapSupportClass),
    attendanceSessions: buildAttendanceSessions(attendanceRows),
  };
}

export async function GET(req: NextRequest) {
  const started = performance.now();
  const { response } = await requireUser();
  if (response) return response;

  const url = new URL(req.url);
  const month = validMonth(url.searchParams.get("month"));
  const supabase = supabaseAdmin();
  const rpcStarted = performance.now();
  const rpc = await supabase.rpc("official_get_makeup_month_state", { p_month: month });

  let payload: any;
  let mode = "rpc";
  if (!rpc.error) {
    const raw = rpc.data || {};
    payload = {
      deleted: !!raw.deleted,
      deletedMonths: raw.deletedMonths || [],
      deletedRows: raw.deletedRows || [],
      availableMonths: raw.availableMonths || [],
      absenceRecords: (raw.absenceRecords || []).map(mapAbsence),
      makeupPlans: (raw.makeupPlans || []).map(mapPlan),
      supportClasses: (raw.supportClasses || []).map(mapSupportClass),
      attendanceSessions: buildAttendanceSessions(raw.attendanceSessions || []),
    };
  } else if (isMissingRpc(rpc.error, "official_get_makeup_month_state")) {
    mode = "legacy";
    try {
      payload = await legacyMonthState(supabase, month);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Không tải được dữ liệu học bù" }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: rpc.error.message || "Không tải được dữ liệu học bù" }, { status: rpc.error?.code === "P0001" ? 400 : 500 });
  }

  const res = NextResponse.json({ ok: true, month, ...payload, mode });
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Server-Timing", `rpc;dur=${(performance.now() - rpcStarted).toFixed(1)},total;dur=${(performance.now() - started).toFixed(1)}`);
  return res;
}
