import { NextRequest, NextResponse } from "next/server";
import { canManage, hasRole, requireUser } from "@/lib/auth";
import { teacherForUser } from "@/lib/classes";
import { supabaseAdmin } from "@/lib/supabase";

function validDate(v: string | null) {
  const s = String(v || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function datesInRange(start: string, end: string) {
  if (!start || !end) return [];
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00+07:00`);
  const endDate = new Date(`${end}T00:00:00+07:00`);
  if (!Number.isFinite(d.getTime()) || !Number.isFinite(endDate.getTime())) return [];
  while (d.getTime() < endDate.getTime() && out.length < 45) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    d.setDate(d.getDate() + 1);
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
export async function GET(req: NextRequest) {
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

  const classRes = allMakeupClassIds.length
    ? await supabase
        .from("official_classes")
        .select("id,name,grade,note,teacher_id,assistant_teacher_id,assistant_name,start_date,end_date,status,created_at")
        .in("id", allMakeupClassIds)
    : ({ data: [], error: null } as any);

  if (classRes.error) return NextResponse.json({ error: classRes.error.message }, { status: 500 });

  const classRows = classRes.data || [];
  const classTeacherIds = uniq([...classRows.map((c:any)=>c.teacher_id), ...classRows.map((c:any)=>c.assistant_teacher_id)]);
  const classById = new Map<string, any>(classRows.map((c:any)=>[String(c.id), c]));

  let currentTeacherId = "";
  if (!canManage(user) && (hasRole(user, "teacher") || hasRole(user, "ta"))) {
    const teacher = await teacherForUser(user);
    currentTeacherId = String(teacher?.id || "");
  }

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

  const sourceAbsenceIds = uniq((mRes.data || []).map((r: any) => r.absence_id));
  const sourceAbsenceRes = sourceAbsenceIds.length
    ? await supabase
        .from("official_absence_records")
        .select("id, student_id, source_class_id, source_session_key, source_session_label, reason, generated_from_attendance, status, created_at, updated_at")
        .in("id", sourceAbsenceIds)
    : ({ data: [], error: null } as any);

  if (sourceAbsenceRes.error) return NextResponse.json({ error: sourceAbsenceRes.error.message }, { status: 500 });

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

  return NextResponse.json({
    ok: true,
    start: start || null,
    end: end || null,
    currentTeacherId: currentTeacherId || null,
    classCancellations,
    classMakeupSessions,
    makeupPlans,
    sourceAbsenceRecords,
  });
}
