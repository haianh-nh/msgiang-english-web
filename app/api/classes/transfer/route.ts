import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage, canTuition } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureTeacherByName, gradeOf, normalizeScheduleInput, toV48Class } from "@/lib/classes";
import { CLASS_WITH_RELATIONS_SELECT, STUDENT_CLIENT_SELECT } from "@/lib/db-selects";

function validDate(v: any) {
  const s = String(v || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function previousDate(date: string) {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}


async function teacherRefFromIdOrName(id: any, name: any): Promise<any> {
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

function mapStudentForClient(s: any) {
  return {
    id: s.id,
    name: s.name,
    contact: [s.parent_phone, s.note].filter(Boolean).join(" • ") || "Chưa có",
    parentName: s.parent_name || "",
    parentPhone: s.parent_phone || "",
    note: s.note || "",
  };
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền chuyển lớp" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const sourceClassId = String(body.sourceClassId || "").trim();
  const name = String(body.name || "").trim();
  const selectedStudentIds = Array.isArray(body.studentIds) ? body.studentIds.map((x:any)=>String(x)).filter(Boolean) : [];
  const startDate = validDate(body.startDate) || new Date().toISOString().slice(0, 10);
  const oldEndDate = validDate(body.oldEndDate) || previousDate(startDate);
  const schedules = normalizeScheduleInput(body.schedules || []);

  if (!sourceClassId) return NextResponse.json({ error: "Thiếu lớp cũ" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Thiếu tên lớp mới" }, { status: 400 });
  if (!selectedStudentIds.length) return NextResponse.json({ error: "Chọn ít nhất 1 học sinh để chuyển lớp" }, { status: 400 });

  const supabase = supabaseAdmin();

  const { data: sourceClass, error: sourceError } = await supabase
    .from("official_classes")
    .select("id,name,status")
    .eq("id", sourceClassId)
    .maybeSingle();

  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });
  if (!sourceClass) return NextResponse.json({ error: "Không tìm thấy lớp cũ" }, { status: 404 });
  if (String(sourceClass.status || "active").toLowerCase() === "ended") {
    return NextResponse.json({ error: "Lớp đã kết thúc, không thể chuyển lớp hoặc chỉnh sửa." }, { status: 409 });
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("official_classes")
    .select("id")
    .ilike("name", name)
    .or("status.is.null,status.neq.ended")
    .limit(1);

  if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 500 });
  if ((duplicate || []).some((x:any)=>String(x.id) !== sourceClassId)) {
    return NextResponse.json({ error: "Tên lớp mới đã tồn tại. Vui lòng chọn tên khác." }, { status: 409 });
  }

  const { data: sourceStudents, error: studentsError } = await supabase
    .from("official_students")
    .select("id,name,parent_name,parent_phone,contact,note,status")
    .eq("class_id", sourceClassId)
    .in("id", selectedStudentIds);

  if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 });
  if ((sourceStudents || []).length !== selectedStudentIds.length) {
    return NextResponse.json({ error: "Một số học sinh không còn trong lớp cũ. Vui lòng tải lại và thử lại." }, { status: 400 });
  }

  const teacher = await teacherRefFromIdOrName(body.teacherId || body.teacher_id, String(body.teacherName || body.teacher || "").trim() || "Chưa phân công");
  const assistant = await teacherRefFromIdOrName(body.assistantTeacherId || body.taId || body.assistant_teacher_id, body.assistantName || body.ta);
  if (teacher?.id && assistant?.id && String(teacher.id) === String(assistant.id)) {
    return NextResponse.json({ error: "Giáo viên chính và TA không nên là cùng một người." }, { status: 400 });
  }

  const { data: newClassRow, error: createError } = await supabase
    .from("official_classes")
    .insert({
      name,
      grade: gradeOf(name),
      teacher_id: teacher?.id || null,
      assistant_teacher_id: assistant?.id || null,
      assistant_name: assistant?.name || String(body.assistantName || body.ta || "").trim() || null,
      start_date: startDate,
      end_date: null,
      status: "active",
      note: String(body.note || `Chuyển lên từ ${sourceClass.name}`).slice(0, 500),
    })
    .select("id")
    .single();

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });

  if (schedules.length) {
    const { error: scheduleError } = await supabase.from("official_class_schedules").insert(
      schedules.map((s:any)=>({ ...s, class_id: newClassRow.id }))
    );
    if (scheduleError) return NextResponse.json({ error: scheduleError.message }, { status: 500 });
  }

  const rowsToInsert = (sourceStudents || []).map((s:any)=>({
    class_id: newClassRow.id,
    name: s.name,
    parent_name: s.parent_name || null,
    parent_phone: s.parent_phone || null,
    contact: s.contact || null,
    note: [s.note, `Chuyển từ ${sourceClass.name}`, `Mã học sinh cũ: ${s.id}`].filter(Boolean).join(" • "),
    status: "active",
  }));

  const { data: insertedStudents, error: insertStudentsError } = await supabase
    .from("official_students")
    .insert(rowsToInsert)
    .select(STUDENT_CLIENT_SELECT);

  if (insertStudentsError) return NextResponse.json({ error: insertStudentsError.message }, { status: 500 });

  const { error: endError } = await supabase
    .from("official_classes")
    .update({
      status: "ended",
      end_date: oldEndDate,
      note: `Đã chuyển lên ${name}`,
    })
    .eq("id", sourceClassId);

  if (endError) return NextResponse.json({ error: endError.message }, { status: 500 });

  const { data: endedFull, error: endedFullError } = await supabase
    .from("official_classes")
    .select(CLASS_WITH_RELATIONS_SELECT)
    .eq("id", sourceClassId)
    .single();

  if (endedFullError) return NextResponse.json({ error: endedFullError.message }, { status: 500 });

  const { data: newFull, error: newFullError } = await supabase
    .from("official_classes")
    .select(CLASS_WITH_RELATIONS_SELECT)
    .eq("id", newClassRow.id)
    .single();

  if (newFullError) return NextResponse.json({ error: newFullError.message }, { status: 500 });

  const monthKey = new Date().toISOString().slice(0, 7);
  const evaluationRows = (insertedStudents || []).map((s:any)=>({
    student_id: s.id,
    class_id: newClassRow.id,
    month_key: monthKey,
    scores: { Listening:3, Speaking:3, Reading:3, Writing:3, Vocabulary:3, Participation:3, Homework:3 },
    status: "draft",
    comment: `Học sinh chuyển lên từ ${sourceClass.name}.`,
    strengths: "Đã hoàn thành kỳ trước.",
    improvements: "Tiếp tục theo dõi trong lớp mới.",
    suggestion: "Phụ huynh duy trì thói quen ôn bài hằng tuần.",
    created_by: user.id,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }));
  if (evaluationRows.length) {
    await supabase.from("official_evaluations").upsert(evaluationRows, { onConflict: "student_id,month_key" });
  }

  await supabase
    .from("official_v48_state")
    .delete()
    .neq("user_id", "00000000-0000-0000-0000-000000000000");

  return NextResponse.json({
    ok: true,
    oldClass: toV48Class(endedFull, { includeTuition: canTuition(user) }),
    newClass: toV48Class(newFull, { includeTuition: canTuition(user) }),
    transferredStudents: (insertedStudents || []).map(mapStudentForClient),
  });
}
