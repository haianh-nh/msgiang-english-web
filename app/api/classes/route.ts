import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureTeacherByName, fetchClassesV48, fetchTeachersV48, gradeOf, normalizeScheduleInput, toV48Class } from "@/lib/classes";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  try {
    const [classes, teachers] = await Promise.all([fetchClassesV48(user), fetchTeachersV48()]);
    return NextResponse.json({ ok: true, classes, teachers });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Không tải được danh sách lớp" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền tạo lớp" }, { status: 403 });

  const body = await req.json().catch(()=>({}));
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Thiếu tên lớp" }, { status: 400 });

  const supabase = supabaseAdmin();
  const teacher = await ensureTeacherByName(String(body.teacherName || body.teacher || "").trim() || "Chưa phân công");
  const schedules = normalizeScheduleInput(body.schedules || []);

  const { data: klass, error } = await supabase
    .from("official_classes")
    .insert({
      name,
      grade: gradeOf(name),
      teacher_id: teacher?.id || null,
      assistant_name: String(body.assistantName || body.ta || "").trim() || null,
      start_date: body.startDate || body.start_date || new Date().toISOString().slice(0,10),
      status: "active",
      note: body.note || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (schedules.length) {
    const { error: se } = await supabase.from("official_class_schedules").insert(
      schedules.map((s:any)=>({ ...s, class_id: klass.id }))
    );
    if (se) return NextResponse.json({ error: se.message }, { status: 500 });
  }

  const { data: full, error: fe } = await supabase
    .from("official_classes")
    .select("*, official_teachers:teacher_id(*), official_students(*), official_class_schedules(*)")
    .eq("id", klass.id)
    .single();

  if (fe) return NextResponse.json({ error: fe.message }, { status: 500 });
  return NextResponse.json({ ok: true, class: toV48Class(full) });
}
