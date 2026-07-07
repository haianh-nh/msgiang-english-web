import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureTeacherByName, fetchClassesV48, fetchTeachersV48, gradeOf, normalizeScheduleInput, toV48Class } from "@/lib/classes";

async function teacherRefFromIdOrName(id: any, name: any) {
  const supabase = supabaseAdmin();
  const cleanId = String(id || "").trim();
  if (cleanId) {
    const { data, error } = await supabase.from("official_teachers").select("id,name").eq("id", cleanId).maybeSingle();
    if (error) throw error;
    if (data?.id) return data;
  }
  const cleanName = String(name || "").trim();
  if (cleanName) return await ensureTeacherByName(cleanName);
  return null;
}

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

  const { data: duplicate, error: duplicateError } = await supabase
    .from("official_classes")
    .select("id,status")
    .ilike("name", name)
    .or("status.is.null,status.neq.ended")
    .limit(1);

  if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 500 });
  if ((duplicate || []).length) return NextResponse.json({ error: "Tên lớp đang học đã tồn tại. Vui lòng chọn tên khác." }, { status: 409 });

  const teacher = await teacherRefFromIdOrName(body.teacherId || body.teacher_id, String(body.teacherName || body.teacher || "").trim() || "Chưa phân công");
  const assistant = await teacherRefFromIdOrName(body.assistantTeacherId || body.taId || body.assistant_teacher_id, body.assistantName || body.ta);
  if (teacher?.id && assistant?.id && String(teacher.id) === String(assistant.id)) {
    return NextResponse.json({ error: "Giáo viên chính và TA không nên là cùng một người." }, { status: 400 });
  }
  const schedules = normalizeScheduleInput(body.schedules || []);
  const seen = new Set<string>();
  for (const s of schedules) {
    const key = `${s.day_of_week}|${s.start_time}|${s.end_time}`;
    if (seen.has(key)) return NextResponse.json({ error: "Hai buổi học không được trùng cùng thứ và cùng khung giờ." }, { status: 400 });
    seen.add(key);
    if (String(s.start_time) >= String(s.end_time)) return NextResponse.json({ error: "Giờ bắt đầu phải nhỏ hơn giờ kết thúc" }, { status: 400 });
  }

  const { data: klass, error } = await supabase
    .from("official_classes")
    .insert({
      name,
      grade: gradeOf(name),
      teacher_id: teacher?.id || null,
      assistant_teacher_id: assistant?.id || null,
      assistant_name: assistant?.name || String(body.assistantName || body.ta || "").trim() || null,
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
    .select("*, official_teachers:teacher_id(*), official_assistant_teacher:assistant_teacher_id(*), official_students(*), official_class_schedules(*)")
    .eq("id", klass.id)
    .single();

  if (fe) return NextResponse.json({ error: fe.message }, { status: 500 });
  return NextResponse.json({ ok: true, class: toV48Class(full) });
}
