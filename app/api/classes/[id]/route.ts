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
  const { error } = await supabaseAdmin().from("official_classes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
