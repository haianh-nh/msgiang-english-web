import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage, canTuition } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ensureTeacherByName, gradeOf, normalizeScheduleInput, toV48Class } from "@/lib/classes";
import { CLASS_WITH_RELATIONS_SELECT } from "@/lib/db-selects";

function scheduleSignature(schedules: any[] = []) {
  return normalizeScheduleInput(schedules)
    .map((s:any)=>`${s.day_of_week}|${String(s.start_time).slice(0,5)}|${String(s.end_time).slice(0,5)}`)
    .sort()
    .join(";");
}

function futureMakeupTarget(targetSessionKey: any) {
  const parts = String(targetSessionKey || "").split("|");
  if (parts.length < 4) return true;
  const date = parts[1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return true;
  return date >= new Date().toISOString().slice(0, 10);
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền sửa lớp" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(()=>({}));
  const supabase = supabaseAdmin();

  const { data: current, error: currentError } = await supabase
    .from("official_classes")
    .select("id,name,status,teacher_id,assistant_teacher_id")
    .eq("id", id)
    .maybeSingle();

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });

  // V20M: Lớp đã kết thúc bị khóa hoàn toàn, không cho PATCH bất kỳ thông tin nào.
  if (String(current.status || "active").toLowerCase() === "ended") {
    return NextResponse.json({ error: "Lớp đã kết thúc, không thể chỉnh sửa." }, { status: 409 });
  }

  const update: any = {};

  if (body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Tên lớp không được trống" }, { status: 400 });

    const { data: duplicate, error: duplicateError } = await supabase
      .from("official_classes")
      .select("id,status")
      .ilike("name", name)
      .neq("id", id)
      .or("status.is.null,status.neq.ended")
      .limit(1);

    if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 500 });
    if ((duplicate || []).length) {
      return NextResponse.json({ error: "Tên lớp đang học đã tồn tại. Vui lòng chọn tên khác." }, { status: 409 });
    }

    update.name = name;
    update.grade = gradeOf(name);
  }

  if (body.status !== undefined) update.status = String(body.status);
  if (body.startDate !== undefined || body.start_date !== undefined) update.start_date = body.startDate || body.start_date;
  if (body.endDate !== undefined || body.end_date !== undefined) update.end_date = body.endDate || body.end_date || null;
  if (body.note !== undefined) update.note = String(body.note || "").trim() || null;

  if (body.teacherId !== undefined || body.teacher_id !== undefined || body.teacherName !== undefined || body.teacher !== undefined) {
    const teacher = await teacherRefFromIdOrName(body.teacherId || body.teacher_id, body.teacherName || body.teacher);
    update.teacher_id = teacher?.id || null;
  }

  if (body.assistantTeacherId !== undefined || body.taId !== undefined || body.assistant_teacher_id !== undefined || body.assistantName !== undefined || body.ta !== undefined) {
    const assistant = await teacherRefFromIdOrName(body.assistantTeacherId || body.taId || body.assistant_teacher_id, body.assistantName || body.ta);
    update.assistant_teacher_id = assistant?.id || null;
    update.assistant_name = assistant?.name || String(body.assistantName || body.ta || "").trim() || null;
  }

  const nextTeacherId = update.teacher_id !== undefined ? update.teacher_id : current.teacher_id;
  const nextAssistantTeacherId = update.assistant_teacher_id !== undefined ? update.assistant_teacher_id : current.assistant_teacher_id;
  if (nextTeacherId && nextAssistantTeacherId && String(nextTeacherId) === String(nextAssistantTeacherId)) {
    return NextResponse.json({ error: "Giáo viên chính và TA không nên là cùng một người." }, { status: 400 });
  }

  let normalizedSchedules: any[] | null = null;
  if (Array.isArray(body.schedules)) {
    normalizedSchedules = normalizeScheduleInput(body.schedules);
    if (!normalizedSchedules.length) {
      return NextResponse.json({ error: "Lịch học không hợp lệ" }, { status: 400 });
    }

    const seen = new Set<string>();
    for (const s of normalizedSchedules) {
      const key = `${s.day_of_week}|${s.start_time}|${s.end_time}`;
      if (seen.has(key)) return NextResponse.json({ error: "Hai buổi học không được trùng cùng thứ và cùng khung giờ." }, { status: 400 });
      seen.add(key);
      if (String(s.start_time) >= String(s.end_time)) {
        return NextResponse.json({ error: "Giờ bắt đầu phải nhỏ hơn giờ kết thúc" }, { status: 400 });
      }
    }

    const { data: oldSchedules, error: oldScheduleError } = await supabase
      .from("official_class_schedules")
      .select("day_of_week,start_time,end_time,sort_order")
      .eq("class_id", id)
      .order("sort_order", { ascending: true });

    if (oldScheduleError) return NextResponse.json({ error: oldScheduleError.message }, { status: 500 });

    const scheduleChanged = scheduleSignature(oldSchedules || []) !== scheduleSignature(normalizedSchedules);
    if (scheduleChanged) {
      const { data: plans, error: planError } = await supabase
        .from("official_makeup_plans")
        .select("id,target_session_key,status")
        .eq("target_class_id", id)
        .neq("status", "cancelled");

      if (planError) return NextResponse.json({ error: planError.message }, { status: 500 });

      const hasFutureMakeup = (plans || []).some((p:any)=>futureMakeupTarget(p.target_session_key));
      if (hasFutureMakeup) {
        return NextResponse.json({
          error: "Lớp đang có học sinh học bù đã xếp vào lịch tương lai. Hãy hủy/xử lý học bù trước khi đổi lịch học.",
        }, { status: 409 });
      }
    }
  }

  const { error } = await supabase.from("official_classes").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (normalizedSchedules) {
    await supabase.from("official_class_schedules").delete().eq("class_id", id);
    const { error: se } = await supabase.from("official_class_schedules").insert(
      normalizedSchedules.map((s:any)=>({ ...s, class_id: id }))
    );
    if (se) return NextResponse.json({ error: se.message }, { status: 500 });
  }

  const { data: full, error: fe } = await supabase
    .from("official_classes")
    .select(CLASS_WITH_RELATIONS_SELECT)
    .eq("id", id)
    .single();

  if (fe) return NextResponse.json({ error: fe.message }, { status: 500 });

  await supabase
    .from("official_v48_state")
    .delete()
    .neq("user_id", "00000000-0000-0000-0000-000000000000");

  return NextResponse.json({ ok: true, class: toV48Class(full, { includeTuition: canTuition(user) }) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền xóa lớp" }, { status: 403 });

  const { id } = await params;
  const supabase = supabaseAdmin();

  const { data: classRow, error: classError } = await supabase
    .from("official_classes")
    .select("id, name, status")
    .eq("id", id)
    .maybeSingle();

  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  if (!classRow) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
  if (String(classRow.status || "active").toLowerCase() === "ended") {
    return NextResponse.json({ error: "Lớp đã kết thúc, không thể xóa hoặc chỉnh sửa." }, { status: 409 });
  }

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
    return NextResponse.json({
      ok: true,
      warning: "Đã xóa lớp nhưng có một số mục phụ cần kiểm tra",
      ...(canTuition(user) ? { cleanupErrors } : {}),
    });
  }

  return NextResponse.json({ ok: true, deletedClassId: id, deletedStudentIds: studentIds });
}

