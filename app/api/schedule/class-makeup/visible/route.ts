import { NextRequest, NextResponse } from "next/server";
import { canManage, hasRole, requireUser } from "@/lib/auth";
import { teacherIdentitiesForUser } from "@/lib/classes";
import { supabaseAdmin } from "@/lib/supabase";

function uniq(values: any[]) {
  return Array.from(new Set(values.map((v) => String(v || "")).filter(Boolean)));
}

function parseSessionKey(key: string) {
  const parts = String(key || "").split("|");
  if (parts.length < 4) return null;
  const [classId, date, day, slot] = parts;
  const [start, end] = String(slot || "").split("-");
  if (!classId || !date || !day || !start || !end) return null;
  return { classId, date, day, start, end };
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

function classSnapshots(classes: any[] = [], teachers: any[] = [], students: any[] = []) {
  const teacherMap = new Map<string, any>(teachers.map((t:any)=>[String(t.id), t]));
  const studentMap = new Map<string, any[]>();

  for (const s of students || []) {
    const classId = String(s.class_id || "");
    if (!classId) continue;
    if (!studentMap.has(classId)) studentMap.set(classId, []);
    studentMap.get(classId)!.push(mapStudent(s));
  }

  const out = new Map<string, any>();
  for (const c of classes || []) {
    const teacher = teacherMap.get(String(c.teacher_id || "")) as any;
    out.set(String(c.id), {
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
    });
  }
  return out;
}

export async function GET(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = supabaseAdmin();

  const { data: allMakeups, error: makeupError } = await supabase
    .from("official_class_makeup_sessions")
    .select("id, class_id, source_session_key, teacher_id, makeup_date, day_key, start_time, end_time, reason, status, created_at, updated_at")
    .neq("status", "cancelled")
    .order("makeup_date", { ascending: true });

  if (makeupError) return NextResponse.json({ error: makeupError.message }, { status: 500 });

  const allRows = allMakeups || [];
  const classIds = uniq(allRows.map((r:any)=>r.class_id));

  const classRes = classIds.length
    ? await supabase
        .from("official_classes")
        .select("id,name,teacher_id,assistant_teacher_id,assistant_name,start_date,end_date,status,created_at")
        .in("id", classIds)
    : ({ data: [], error: null } as any);

  if (classRes.error) return NextResponse.json({ error: classRes.error.message }, { status: 500 });

  const classRows = classRes.data || [];
  const classById = new Map<string, any>(classRows.map((c:any)=>[String(c.id), c]));

  let currentTeacherIds = new Set<string>();
  if (!canManage(user) && (hasRole(user, "teacher") || hasRole(user, "ta"))) {
    const teachers = await teacherIdentitiesForUser(user);
    currentTeacherIds = new Set(teachers.map((row: any) => String(row?.id || "")).filter(Boolean));
  }

  const visibleRows = canManage(user)
    ? allRows
    : allRows.filter((r:any)=>{
        if (!currentTeacherIds.size) return false;
        const assigned = String(r.teacher_id || "");
        const classRow = classById.get(String(r.class_id || ""));
        const mainTeacher = String(classRow?.teacher_id || "");
        const assistantTeacher = String(classRow?.assistant_teacher_id || "");
        return assigned
          ? currentTeacherIds.has(assigned) || currentTeacherIds.has(mainTeacher) || currentTeacherIds.has(assistantTeacher)
          : currentTeacherIds.has(mainTeacher) || currentTeacherIds.has(assistantTeacher);
      });

  const visibleClassIds = uniq(visibleRows.map((r:any)=>r.class_id));
  const visibleClassRows = classRows.filter((c:any)=>visibleClassIds.includes(String(c.id)));
  const teacherIds = uniq([...visibleRows.map((r:any)=>r.teacher_id), ...visibleClassRows.map((c:any)=>c.teacher_id), ...visibleClassRows.map((c:any)=>c.assistant_teacher_id)]);

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

  const teacherMap = new Map<string, any>((teacherRes.data || []).map((t:any)=>[String(t.id), t]));
  const snapshots = classSnapshots(visibleClassRows, teacherRes.data || [], studentRes.data || []);

  const classCancellations: Record<string, any> = {};

  const classMakeupSessions = visibleRows.map((r:any)=>{
    const assignedTeacher = teacherMap.get(String(r.teacher_id || "")) as any;
    const snap = snapshots.get(String(r.class_id || "")) || null;

    const parsed = parseSessionKey(r.source_session_key);
    if (parsed) {
      classCancellations[r.source_session_key] = {
        sessionKey: r.source_session_key,
        classId: parsed.classId,
        date: parsed.date,
        day: parsed.day,
        start: parsed.start,
        end: parsed.end,
        reason: "Nghỉ buổi học",
        inferredFromClassMakeup: true,
        createdAt: r.created_at,
      };
    }

    return {
      id: r.id,
      classId: r.class_id,
      sourceSessionKey: r.source_session_key,
      teacherId: r.teacher_id || null,
      teacher: assignedTeacher?.name || "",
      className: snap?.name || "",
      classSnapshot: snap,
      visibleToCurrentUser: true,
      date: r.makeup_date,
      day: r.day_key,
      start: String(r.start_time || "").slice(0, 5),
      end: String(r.end_time || "").slice(0, 5),
      reason: r.reason || "Dạy bù",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  return NextResponse.json({
    ok: true,
    currentTeacherId: Array.from(currentTeacherIds)[0] || null,
    classCancellations,
    classMakeupSessions,
  });
}
