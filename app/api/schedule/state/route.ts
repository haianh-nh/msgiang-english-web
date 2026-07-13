import { NextRequest, NextResponse } from "next/server";
import { canManage, hasRole, requireUser } from "@/lib/auth";
import { teacherForUser } from "@/lib/classes";
import { supabaseAdmin } from "@/lib/supabase";

function validDate(v: string | null) {
  const s = String(v || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function parseYmdUtc(date: string) {
  const [y, m, d] = String(date || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function formatYmdUtc(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function datesInRange(start: string, end: string) {
  if (!start || !end) return [];
  const out: string[] = [];
  const d = parseYmdUtc(start);
  const endDate = parseYmdUtc(end);
  if (!d || !endDate || !Number.isFinite(d.getTime()) || !Number.isFinite(endDate.getTime())) return [];
  while (d.getTime() < endDate.getTime() && out.length < 45) {
    out.push(formatYmdUtc(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function applyTargetSessionDateFilter(query: any, dates: string[]) {
  const safe = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (!safe.length) return query;
  return query.or(safe.map((d) => `target_session_key.like.*|${d}|*`).join(","));
}

const CLASS_MAKEUP_SELECT =
  "id, class_id, source_session_key, teacher_id, makeup_date, day_key, start_time, end_time, reason, status, created_at, updated_at";

function uniq(values: any[]) {
  return Array.from(new Set(values.map((v) => String(v || "")).filter(Boolean)));
}

function mapStudent(s: any) {
  return {
    id: s.id,
    name: s.name,
    contact: [s.parent_phone, s.note].filter(Boolean).join(" • ") || "Chưa có",
    parentName: s.parent_name || "",
    parentPhone: s.parent_phone || "",
    note: s.note || "",
  };
}

function buildClassSnapshots(classes: any[] = [], teachers: any[] = [], students: any[] = []) {
  const teacherMap = new Map<string, any>(teachers.map((t:any) => [String(t.id), t]));
  const studentMap = new Map<string, any[]>();

  for (const s of students || []) {
    const key = String(s.class_id || "");
    if (!key) continue;
    if (!studentMap.has(key)) studentMap.set(key, []);
    studentMap.get(key)!.push(mapStudent(s));
  }

  const map = new Map<string, any>();
  for (const c of classes || []) {
    const teacher = teacherMap.get(String(c.teacher_id || "")) as any;
    map.set(String(c.id), {
      id: c.id,
      name: c.name,
      teacher: teacher?.name || "",
      teacherId: c.teacher_id || null,
      taId: c.assistant_teacher_id || null,
      ta: teacherMap.get(String(c.assistant_teacher_id || ""))?.name || c.assistant_name || "",
      month: "",
      students: studentMap.get(String(c.id)) || [],
      status: c.status || "active",
      startDate: c.start_date || "2026-06-01",
      endDate: c.end_date || "",
      createdAt: c.created_at || "",
      grade: c.grade || "",
      note: c.note || "",
    });
  }

  return map;
}

// V20B.13: schedule/state is the single source for cancellations, assigned class makeup, and student makeup plans.
async function legacyGET(req: NextRequest) {
  const started = performance.now();
  const { user, response } = await requireUser();
  if (response) return response;

  const url = new URL(req.url);
  const start = validDate(url.searchParams.get("start"));
  const end = validDate(url.searchParams.get("end"));

  const supabase = supabaseAdmin();

  // V20B.14: production table official_session_cancellations không có cột id; session_key là khóa.
  let cancellationsQuery = supabase
    .from("official_session_cancellations")
    .select("session_key, class_id, session_date, day_key, start_time, end_time, reason, created_at")
    .order("session_date", { ascending: true });

  if (start && end) {
    cancellationsQuery = cancellationsQuery.gte("session_date", start).lt("session_date", end);
  }

  let classMakeupQuery = supabase
    .from("official_class_makeup_sessions")
    .select(CLASS_MAKEUP_SELECT)
    .neq("status", "cancelled")
    .order("makeup_date", { ascending: true });

  // V20I: schedule screen is week based, so class makeup rows only need current week.
  // This reduces payload for teachers/admins after many makeup sessions accumulate.
  if (start && end) {
    classMakeupQuery = classMakeupQuery.gte("makeup_date", start).lt("makeup_date", end);
  }

  let studentMakeupPlanQuery = supabase
    .from("official_makeup_plans")
    .select("id, absence_id, student_id, source_class_id, source_session_key, target_class_id, target_session_key, status, created_by, created_at, cancelled_at")
    .order("created_at", { ascending: false });

  // Lịch dạy chỉ cần học bù có buổi đích trong tuần đang xem.
  // API riêng /api/makeup/state sẽ xử lý tab Học bù theo tháng.
  if (start && end) {
    studentMakeupPlanQuery = applyTargetSessionDateFilter(studentMakeupPlanQuery, datesInRange(start, end));
  }

  const [cRes, makeupRes, mRes] = await Promise.all([
    cancellationsQuery,
    classMakeupQuery,
    studentMakeupPlanQuery,
  ]);

  if (cRes.error) return NextResponse.json({ error: cRes.error.message }, { status: 500 });
  if (makeupRes.error) return NextResponse.json({ error: makeupRes.error.message }, { status: 500 });
  if (mRes.error) return NextResponse.json({ error: mRes.error.message }, { status: 500 });

  const allMakeupRows = makeupRes.data || [];
  const allMakeupClassIds = uniq(allMakeupRows.map((r:any)=>r.class_id));
  const sourceAbsenceIds = uniq((mRes.data || []).map((r: any) => r.absence_id));

  // These reads are independent. Running them together removes one full Supabase round trip
  // from the schedule screen, which matters when the Vercel function and database are far apart.
  const [classRes, currentTeacher, sourceAbsenceRes] = await Promise.all([
    allMakeupClassIds.length
      ? supabase
          .from("official_classes")
          .select("id,name,grade,note,teacher_id,assistant_teacher_id,assistant_name,start_date,end_date,status,created_at")
          .in("id", allMakeupClassIds)
      : Promise.resolve({ data: [], error: null } as any),
    !canManage(user) && (hasRole(user, "teacher") || hasRole(user, "ta"))
      ? teacherForUser(user)
      : Promise.resolve(null),
    sourceAbsenceIds.length
      ? supabase
          .from("official_absence_records")
          .select("id,student_id,source_class_id,source_session_key,source_session_label,reason,generated_from_attendance,status,created_at,updated_at")
          .in("id", sourceAbsenceIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (classRes.error) return NextResponse.json({ error: classRes.error.message }, { status: 500 });
  if (sourceAbsenceRes.error) return NextResponse.json({ error: sourceAbsenceRes.error.message }, { status: 500 });

  const classRows = classRes.data || [];
  const classById = new Map<string, any>(classRows.map((c:any)=>[String(c.id), c]));
  const currentTeacherId = String(currentTeacher?.id || "");

  const visibleMakeupRows = canManage(user)
    ? allMakeupRows
    : allMakeupRows.filter((r:any) => {
        if (!currentTeacherId) return false;
        const assignedTeacherId = String(r.teacher_id || "");
        const classRow = classById.get(String(r.class_id || ""));
        const classTeacherId = String(classRow?.teacher_id || "");
        const classAssistantId = String(classRow?.assistant_teacher_id || "");
        // V20N: giáo viên chính hoặc TA của lớp đều thấy lịch dạy bù liên quan.
        return assignedTeacherId
          ? assignedTeacherId === currentTeacherId || classTeacherId === currentTeacherId || classAssistantId === currentTeacherId
          : classTeacherId === currentTeacherId || classAssistantId === currentTeacherId;
      });

  const visibleClassIds = uniq(visibleMakeupRows.map((r:any)=>r.class_id));
  const visibleClassRows = classRows.filter((c:any)=>visibleClassIds.includes(String(c.id)));

  const teacherIds = uniq([
    ...visibleMakeupRows.map((r:any)=>r.teacher_id),
    ...visibleClassRows.map((c:any)=>c.teacher_id),
    ...visibleClassRows.map((c:any)=>c.assistant_teacher_id),
  ]);

  const [teacherRes, studentRes] = await Promise.all([
    teacherIds.length
      ? supabase.from("official_teachers").select("id,name").in("id", teacherIds)
      : Promise.resolve({ data: [], error: null } as any),
    visibleClassIds.length
      ? supabase.from("official_students").select("id,class_id,name,parent_name,parent_phone,note").in("class_id", visibleClassIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (teacherRes.error) return NextResponse.json({ error: teacherRes.error.message }, { status: 500 });
  if (studentRes.error) return NextResponse.json({ error: studentRes.error.message }, { status: 500 });

  const teacherMap = new Map<string, any>((teacherRes.data || []).map((t:any) => [String(t.id), t]));
  const classSnapshotMap = buildClassSnapshots(visibleClassRows, teacherRes.data || [], studentRes.data || []);

  const classCancellations: Record<string, any> = {};
  for (const r of cRes.data || []) {
    classCancellations[r.session_key] = {
      sessionKey: r.session_key,
      classId: r.class_id,
      date: r.session_date,
      day: r.day_key,
      start: String(r.start_time || "").slice(0, 5),
      end: String(r.end_time || "").slice(0, 5),
      reason: r.reason || "Nghỉ buổi học",
      createdAt: r.created_at,
    };
  }

  const classMakeupSessions = visibleMakeupRows
    .map((r: any) => {
      const assignedTeacher = teacherMap.get(String(r.teacher_id || "")) as any;
      const classSnapshot = classSnapshotMap.get(String(r.class_id || "")) || null;
      return {
        id: r.id,
        classId: r.class_id,
        sourceSessionKey: r.source_session_key,
        teacherId: r.teacher_id || null,
        teacher: assignedTeacher?.name || "",
        ta: classSnapshot?.ta || "",
        className: classSnapshot?.name || "",
        classSnapshot,
        visibleToCurrentUser: true,
        date: r.makeup_date,
        day: r.day_key,
        start: String(r.start_time || "").slice(0, 5),
        end: String(r.end_time || "").slice(0, 5),
        reason: r.reason || (String(r.source_session_key||"").startsWith("tutoring:") ? "Lớp học kèm" : "Dạy bù"),
        sessionKind: String(r.source_session_key||"").startsWith("tutoring:") ? "tutoring" : "class_makeup",
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    })
    .sort((a: any, b: any) => String(a.date || "").localeCompare(String(b.date || "")));

  const sourceAbsenceRecords = (sourceAbsenceRes.data || []).map((a: any) => ({
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
  }));

  const makeupPlans = (mRes.data || []).map((r: any) => ({
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
  }));

  const res = NextResponse.json({
    ok: true,
    start: start || null,
    end: end || null,
    currentTeacherId: currentTeacherId || null,
    classCancellations,
    classMakeupSessions,
    makeupPlans,
    sourceAbsenceRecords,
  });
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Server-Timing", `total;dur=${(performance.now() - started).toFixed(1)}`);
  return res;
}

function isMissingRpc(error: any, name: string) {
  const msg = String(error?.message || error?.details || "").toLowerCase();
  return error?.code === "PGRST202" || error?.code === "42883" ||
    (msg.includes(name.toLowerCase()) && (msg.includes("not found") || msg.includes("does not exist")));
}

function vietnamCurrentWeekRange() {
  // Work with Vietnam calendar fields independently from the Vercel server timezone.
  const vn = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const day = vn.getUTCDay() || 7;
  const monday = new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  const end = new Date(monday);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start: formatYmdUtc(monday), end: formatYmdUtc(end) };
}

function resolveWeekRange(req: NextRequest) {
  const url = new URL(req.url);
  const requestedStart = validDate(url.searchParams.get("start"));
  const requestedEnd = validDate(url.searchParams.get("end"));
  const startDate = parseYmdUtc(requestedStart);
  const endDate = parseYmdUtc(requestedEnd);
  const spanDays = startDate && endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000)
    : 0;

  if (requestedStart && requestedEnd && spanDays > 0 && spanDays <= 14) {
    return { start: requestedStart, end: requestedEnd };
  }
  return vietnamCurrentWeekRange();
}

type ScheduleRpcResult = { data: any; error: any };
const scheduleWeekInflight = new Map<string, Promise<ScheduleRpcResult>>();

function scheduleWeekRpc(
  supabase: ReturnType<typeof supabaseAdmin>,
  key: string,
  args: Record<string, any>,
) {
  const existing = scheduleWeekInflight.get(key);
  if (existing) return { promise: existing, coalesced: true };

  const promise = Promise.resolve(
    supabase.rpc("official_get_schedule_week_state", args),
  ).then((result: any) => ({ data: result.data, error: result.error }))
    .finally(() => scheduleWeekInflight.delete(key));

  scheduleWeekInflight.set(key, promise);
  return { promise, coalesced: false };
}

// Phase 4B: one database round trip for the weekly Schedule screen.
// The RPC also bundles attendance data, so the frontend can skip /api/attendance/state
// while still falling back safely before migration 017 is installed.
export async function GET(req: NextRequest) {
  const started = performance.now();
  const { user, response } = await requireUser();
  const authFinished = performance.now();
  if (response) return response;

  const { start, end } = resolveWeekRange(req);
  const manage = canManage(user);
  const supabase = supabaseAdmin();
  const inflightKey = [
    String(user?.id || user?.phone || "anonymous"),
    manage ? "manage" : "teaching",
    start,
    end,
  ].join("|");

  const rpcStarted = performance.now();
  const rpcCall = scheduleWeekRpc(supabase, inflightKey, {
    p_start: start,
    p_end: end,
    p_user_id: user?.id || null,
    p_user_phone: user?.phone || null,
    p_can_manage: manage,
  });
  const rpc = await rpcCall.promise;
  const rpcFinished = performance.now();

  if (rpc.error) {
    if (isMissingRpc(rpc.error, "official_get_schedule_week_state")) {
      const fallback = await legacyGET(req);
      fallback.headers.set("X-Schedule-Mode", "legacy");
      fallback.headers.set(
        "Server-Timing",
        `auth;dur=${(authFinished - started).toFixed(1)},fallback;dur=${(performance.now() - rpcFinished).toFixed(1)},total;dur=${(performance.now() - started).toFixed(1)}`,
      );
      return fallback;
    }
    return NextResponse.json(
      { error: rpc.error.message || "Không tải được lịch tuần" },
      { status: 500 },
    );
  }

  const transformStarted = performance.now();
  const data = rpc.data && typeof rpc.data === "object" ? rpc.data : {};
  const payload = {
    ok: true,
    start,
    end,
    currentTeacherId: data.currentTeacherId || null,
    classCancellations: data.classCancellations || {},
    classMakeupSessions: data.classMakeupSessions || [],
    makeupPlans: data.makeupPlans || [],
    sourceAbsenceRecords: data.sourceAbsenceRecords || [],
    attendanceSessions: data.attendanceSessions || {},
    absenceRecords: data.absenceRecords || [],
    attendanceBundled: true,
    mode: "rpc-week",
    meta: data.meta || {},
  };
  const transformFinished = performance.now();

  const res = NextResponse.json(payload);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Vary", "Cookie");
  res.headers.set("X-Schedule-Mode", "rpc-week");
  res.headers.set("X-Schedule-Coalesced", rpcCall.coalesced ? "1" : "0");
  res.headers.set(
    "Server-Timing",
    [
      `auth;dur=${(authFinished - started).toFixed(1)}`,
      `rpc;dur=${(rpcFinished - rpcStarted).toFixed(1)}`,
      `transform;dur=${(transformFinished - transformStarted).toFixed(1)}`,
      `total;dur=${(performance.now() - started).toFixed(1)}`,
    ].join(","),
  );
  return res;
}

