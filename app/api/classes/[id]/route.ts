import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureTeacherByName, gradeOf, normalizeScheduleInput, toV48Class } from "@/lib/classes";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền sửa lớp" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(()=>({}));
  const update: any = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) {
    update.name = String(body.name).trim();
    update.grade = gradeOf(update.name);
  }
  if (body.status !== undefined) update.status = String(body.status);
  if (body.startDate !== undefined || body.start_date !== undefined) update.start_date = body.startDate || body.start_date;
  if (body.endDate !== undefined || body.end_date !== undefined) update.end_date = body.endDate || body.end_date || null;
  if (body.note !== undefined) update.note = body.note || null;
  if (body.teacherName !== undefined || body.teacher !== undefined) {
    const teacher = await ensureTeacherByName(String(body.teacherName || body.teacher || "").trim());
    update.teacher_id = teacher?.id || null;
  }
  if (body.assistantName !== undefined || body.ta !== undefined) update.assistant_name = body.assistantName || body.ta || null;

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("official_classes").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(body.schedules)) {
    await supabase.from("official_class_schedules").delete().eq("class_id", id);
    const schedules = normalizeScheduleInput(body.schedules);
    if (schedules.length) {
      const { error: se } = await supabase.from("official_class_schedules").insert(
        schedules.map((s:any)=>({ ...s, class_id: id }))
      );
      if (se) return NextResponse.json({ error: se.message }, { status: 500 });
    }
  }

  const { data: full, error: fe } = await supabase
    .from("official_classes")
    .select("*, official_teachers:teacher_id(*), official_students(*), official_class_schedules(*)")
    .eq("id", id)
    .single();

  if (fe) return NextResponse.json({ error: fe.message }, { status: 500 });
  return NextResponse.json({ ok: true, class: toV48Class(full) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền xóa lớp" }, { status: 403 });

  const { id } = await params;
  const supabase = supabaseAdmin();

  const { data: classRow, error: classError } = await supabase
    .from("official_classes")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  if (!classRow) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });

  const { data: students, error: studentsError } = await supabase
    .from("official_students")
    .select("id")
    .eq("class_id", id);

  if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 });

  const studentIds = (students || []).map((s: any) => String(s.id)).filter(Boolean);
  const cleanupErrors: string[] = [];

  async function cleanup(label: string, query: any) {
    const { error } = await query;
    if (error) cleanupErrors.push(`${label}: ${error.message}`);
  }

  await cleanup("attendance_sessions", supabase.from("official_attendance_sessions").delete().eq("class_id", id));
  await cleanup("session_cancellations", supabase.from("official_session_cancellations").delete().eq("class_id", id));
  await cleanup("class_makeup_sessions", supabase.from("official_class_makeup_sessions").delete().eq("class_id", id));
  await cleanup("makeup_plans_source", supabase.from("official_makeup_plans").delete().eq("source_class_id", id));
  await cleanup("makeup_plans_target", supabase.from("official_makeup_plans").delete().eq("target_class_id", id));
  await cleanup("absence_records_class", supabase.from("official_absence_records").delete().eq("source_class_id", id));
  await cleanup("evaluations_class", supabase.from("official_evaluations").delete().eq("class_id", id));

  if (studentIds.length) {
    await cleanup("tuition_status_students", supabase.from("official_tuition_status").delete().in("student_id", studentIds));
    await cleanup("attendance_rows_students", supabase.from("official_attendance_rows").delete().in("student_id", studentIds));
    await cleanup("absence_records_students", supabase.from("official_absence_records").delete().in("student_id", studentIds));
    await cleanup("makeup_plans_students", supabase.from("official_makeup_plans").delete().in("student_id", studentIds));
    await cleanup("evaluations_students", supabase.from("official_evaluations").delete().in("student_id", studentIds));
  }

  await cleanup("class_schedules", supabase.from("official_class_schedules").delete().eq("class_id", id));
  await cleanup("students", supabase.from("official_students").delete().eq("class_id", id));

  const { error } = await supabase.from("official_classes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("official_v48_state")
    .delete()
    .neq("user_id", "00000000-0000-0000-0000-000000000000");

  if (cleanupErrors.length) {
    return NextResponse.json({ ok: true, warning: "Đã xóa lớp nhưng có một số mục phụ cần kiểm tra", cleanupErrors });
  }

  return NextResponse.json({ ok: true, deletedClassId: id, deletedStudentIds: studentIds });
}

