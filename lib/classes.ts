import { supabaseAdmin } from "./supabase";

const DAY_KEY_TO_NUM: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
const NUM_TO_DAY_KEY: Record<number, string> = { 0:"Sun", 1:"Mon", 2:"Tue", 3:"Wed", 4:"Thu", 5:"Fri", 6:"Sat" };

export function dayKeyToNum(day: any) {
  const s = String(day ?? "").trim();
  if (s in DAY_KEY_TO_NUM) return DAY_KEY_TO_NUM[s];
  const n = Number(s);
  if (!Number.isNaN(n) && n >= 0 && n <= 6) return n;
  const lower = s.toLowerCase();
  if (["monday","mon","thu 2","thứ 2","2"].includes(lower)) return 1;
  if (["tuesday","tue","thu 3","thứ 3","3"].includes(lower)) return 2;
  if (["wednesday","wed","thu 4","thứ 4","4"].includes(lower)) return 3;
  if (["thursday","thu","thu 5","thứ 5","5"].includes(lower)) return 4;
  if (["friday","fri","thu 6","thứ 6","6"].includes(lower)) return 5;
  if (["saturday","sat","thu 7","thứ 7","7"].includes(lower)) return 6;
  if (["sunday","sun","cn","chủ nhật","chu nhat","0"].includes(lower)) return 0;
  return 1;
}

export function numToDayKey(n: any) {
  return NUM_TO_DAY_KEY[Number(n)] || "Mon";
}

export function gradeOf(name: string) {
  const cleaned = String(name || "").trim();
  let m = cleaned.match(/^G\s*(\d+)\s*\./i);
  if (m) return `G${m[1]}`;
  m = cleaned.match(/^(\d+)\s*\./);
  if (m) return `G${m[1]}`;
  if (/^GK/i.test(cleaned)) return "GK";
  return "Other";
}

export function scheduleText(schedules: any[] = []) {
  return schedules
    .sort((a:any,b:any)=>(a.sort_order||0)-(b.sort_order||0))
    .map((s:any) => `${String(s.start_time).slice(0,5).replace(":","h")} - ${String(s.end_time).slice(0,5).replace(":","h")} ${numToDayKey(s.day_of_week)}`)
    .join("; ");
}

export function toV48Class(c: any) {
  const students = (c.official_students || c.students || []).map((s:any) => ({
    id: s.id,
    name: s.name,
    contact: [s.parent_phone, s.note].filter(Boolean).join(" • ") || "Chưa có",
    parentName: s.parent_name || "",
    parentPhone: s.parent_phone || "",
    note: s.note || "",
  }));

  const teacher = c.official_teachers || c.teacher || null;
  const assistant = c.assistant_teacher || c.official_assistant_teacher || null;
  return {
    id: c.id,
    name: c.name,
    teacher: teacher?.name || c.teacher_name || "",
    teacherId: teacher?.id || c.teacher_id || null,
    taId: assistant?.id || c.assistant_teacher_id || null,
    ta: assistant?.name || c.assistant_name || "",
    time: scheduleText(c.official_class_schedules || c.schedules || []),
    month: "",
    students,
    status: c.status || "active",
    startDate: c.start_date || "2026-06-01",
    endDate: c.end_date || "",
    createdAt: c.created_at || "",
    grade: c.grade || gradeOf(c.name),
    note: c.note || "",
  };
}

export async function ensureTeacherByName(name: string, phone?: string) {
  const supabase = supabaseAdmin();
  const clean = String(name || "").trim();
  if (!clean) return null;

  let q = supabase.from("official_teachers").select("*").ilike("name", clean).limit(1);
  const { data: found } = await q;
  if (found && found[0]) return found[0];

  const { data, error } = await supabase
    .from("official_teachers")
    .insert({ name: clean, phone: phone || null, status: "active" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}


function userRoles(user: any) {
  return Array.isArray(user?.roles) ? user.roles : [];
}

function canManageClasses(user: any) {
  const roles = userRoles(user);
  return roles.includes("admin") || roles.includes("manager");
}

export async function teacherForUser(user: any) {
  if (!user?.id && !user?.phone) return null;
  const supabase = supabaseAdmin();

  if (user?.id) {
    const { data } = await supabase
      .from("official_teachers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) return data;
  }

  if (user?.phone) {
    const { data } = await supabase
      .from("official_teachers")
      .select("*")
      .eq("phone", user.phone)
      .maybeSingle();
    if (data) return data;
  }

  return null;
}

const CLASS_SELECT_V48 = `
  id,
  name,
  grade,
  teacher_id,
  assistant_teacher_id,
  assistant_name,
  start_date,
  end_date,
  status,
  note,
  created_at,
  official_teachers:teacher_id(id,name),
  official_assistant_teacher:assistant_teacher_id(id,name),
  official_students(id,name,parent_name,parent_phone,note),
  official_class_schedules(id,day_of_week,start_time,end_time,sort_order)
`;

export async function fetchClassesV48(user?: any) {
  const supabase = supabaseAdmin();

  if (user && !canManageClasses(user)) {
    const teacher = await teacherForUser(user);
    if (!teacher?.id) return [];

    const activeClassFilter = "status.is.null,status.eq.active";

    const [mainRes, makeupRowsRes] = await Promise.all([
      supabase
        .from("official_classes")
        .select(CLASS_SELECT_V48)
        .or(`teacher_id.eq.${teacher.id},assistant_teacher_id.eq.${teacher.id}`)
        .or(activeClassFilter)
        .not("note", "like", "__tutoring_session__%")
        .order("name", { ascending: true }),
      supabase
        .from("official_class_makeup_sessions")
        .select("class_id")
        .eq("teacher_id", teacher.id)
        .neq("status", "cancelled")
    ]);

    if (mainRes.error) throw mainRes.error;
    if (makeupRowsRes.error) throw makeupRowsRes.error;

    const mainClasses = mainRes.data || [];
    const ownedIds = new Set(mainClasses.map((c:any)=>String(c.id)));
    const makeupClassIds = Array.from(
      new Set((makeupRowsRes.data || []).map((r:any)=>String(r.class_id || "")).filter(Boolean))
    ).filter(id=>!ownedIds.has(id));

    let makeupClasses: any[] = [];
    if (makeupClassIds.length) {
      const { data, error } = await supabase
        .from("official_classes")
        .select(CLASS_SELECT_V48)
        .in("id", makeupClassIds)
        .or(activeClassFilter)
        .not("note", "like", "__tutoring_session__%")
        .order("name", { ascending: true });
      if (error) throw error;
      makeupClasses = data || [];
    }

    return [...mainClasses, ...makeupClasses].map(toV48Class);
  }

  const { data: classes, error } = await supabase
    .from("official_classes")
    .select(CLASS_SELECT_V48)
    .not("note", "like", "__tutoring_session__%")
    .order("name", { ascending: true });

  if (error) throw error;
  return (classes || []).map(toV48Class);
}

export async function fetchTeachersV48() {
  const { data, error } = await supabaseAdmin()
    .from("official_teachers")
    .select("id,user_id,name,phone,email,status,note, official_users:user_id(id,phone,email,roles,status,must_change_password)")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map((t:any)=>{
    const user = Array.isArray(t.official_users) ? t.official_users[0] : t.official_users;
    return {
      id: t.id,
      userId: t.user_id || user?.id || "",
      name: t.name,
      phone: t.phone || user?.phone || "",
      email: t.email || user?.email || "",
      roles: Array.isArray(user?.roles) ? user.roles : ["teacher"],
      status: t.status || user?.status || "active",
      mustChangePassword: !!user?.must_change_password,
      note: t.note || "",
    };
  });
}

export function normalizeScheduleInput(schedules: any[], fallbackTime?: string) {
  const rows = Array.isArray(schedules) ? schedules : [];
  return rows
    .filter((s:any)=>s && (s.day || s.dayKey || s.day_of_week || s.start || s.start_time))
    .map((s:any, idx:number)=>({
      day_of_week: dayKeyToNum(s.day ?? s.dayKey ?? s.day_of_week),
      start_time: String(s.start || s.start_time || "17:00").slice(0,5),
      end_time: String(s.end || s.end_time || "18:30").slice(0,5),
      sort_order: idx + 1,
    }));
}
