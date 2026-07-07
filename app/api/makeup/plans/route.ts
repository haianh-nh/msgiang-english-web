import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { teacherForUser } from "@/lib/classes";


function inactiveClassStatus(v: any) {
  return ["ended", "inactive", "cancelled", "canceled", "deleted", "archived"].includes(String(v || "active").toLowerCase());
}

function targetSessionIsTodo(targetSessionKey: string) {
  // Expected key: classId|YYYY-MM-DD|Day|HH:mm-HH:mm
  const parts = String(targetSessionKey || "").split("|");
  if (parts.length < 4) return false;
  const date = parts[1];
  const slot = parts[3] || "";
  const start = slot.split("-")[0] || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start)) return false;
  const startAt = new Date(`${date}T${start}:00+07:00`);
  return Number.isFinite(startAt.getTime()) && new Date().getTime() < startAt.getTime();
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const targetClassId = String(body.targetClassId || "");
  const targetSessionKey = String(body.targetSessionKey || "");
  const sourceClassId = String(body.sourceClassId || "");
  const studentId = String(body.studentId || "");
  const absenceId = String(body.absenceId || "");
  if (!targetClassId || !targetSessionKey || !sourceClassId || !studentId || !absenceId) {
    return NextResponse.json({ error: "Thiếu thông tin xếp học bù" }, { status: 400 });
  }
  if (targetClassId === sourceClassId) {
    return NextResponse.json({ error: "Học sinh đã thuộc lớp này, không cần xếp học bù vào chính lớp gốc" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: classes, error: ce } = await supabase
    .from("official_classes")
    .select("id,name,status,start_date,end_date,teacher_id,assistant_teacher_id")
    .in("id", [targetClassId, sourceClassId]);
  if (ce) return NextResponse.json({ error: ce.message }, { status: 500 });
  const targetClass = (classes || []).find((c: any) => c.id === targetClassId);
  const sourceClass = (classes || []).find((c: any) => c.id === sourceClassId);
  if (!targetClass || !sourceClass) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });

  if (!canManage(user)) {
    const teacher = await teacherForUser(user);
    const me = String(teacher?.id || "");
    const targetMain = String(targetClass.teacher_id || "");
    const targetTA = String(targetClass.assistant_teacher_id || "");
    if (!me || (targetMain !== me && targetTA !== me)) {
      return NextResponse.json({ error: "Không có quyền xếp học bù vào lớp này" }, { status: 403 });
    }
  }

  // V20L: học bù xếp tự do, không bắt buộc cùng khối nữa.
  // Chỉ được xếp vào lớp còn hoạt động và buổi chưa học.
  if (inactiveClassStatus(targetClass.status)) {
    return NextResponse.json({ error: "Không thể xếp học bù vào lớp đã kết thúc hoặc đã hủy" }, { status: 400 });
  }
  if (!targetSessionIsTodo(targetSessionKey)) {
    return NextResponse.json({ error: "Chỉ được xếp học bù vào buổi Chưa dạy" }, { status: 400 });
  }

  const { data: absence, error: ae } = await supabase
    .from("official_absence_records")
    .select("id,status")
    .eq("id", absenceId)
    .maybeSingle();
  if (ae) return NextResponse.json({ error: ae.message }, { status: 500 });
  if (!absence?.id) return NextResponse.json({ error: "Không tìm thấy lượt vắng" }, { status: 404 });
  if (String(absence.status || "pending") !== "pending") {
    return NextResponse.json({ error: "Lượt vắng này đã được xếp học bù" }, { status: 400 });
  }

  const { data: existingAbsencePlan } = await supabase
    .from("official_makeup_plans")
    .select("id,status")
    .eq("absence_id", absenceId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (existingAbsencePlan?.id) {
    return NextResponse.json({ error: "Lượt vắng này đã được xếp học bù" }, { status: 400 });
  }

  const settings = await getSettings();
  const capacity = Number(settings.session_capacity || 15);

  const { count: officialCount, error: oe } = await supabase
    .from("official_students")
    .select("id", { count: "exact", head: true })
    .eq("class_id", targetClassId)
    .eq("status", "active");
  if (oe) return NextResponse.json({ error: oe.message }, { status: 500 });

  const { count: makeupCount, error: me } = await supabase
    .from("official_makeup_plans")
    .select("id", { count: "exact", head: true })
    .eq("target_session_key", targetSessionKey)
    .eq("status", "scheduled");
  if (me) return NextResponse.json({ error: me.message }, { status: 500 });

  if ((officialCount || 0) + (makeupCount || 0) >= capacity) {
    return NextResponse.json({ error: `Buổi này đã đủ ${capacity} học sinh` }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("official_makeup_plans")
    .select("id,status")
    .eq("target_session_key", targetSessionKey)
    .eq("student_id", studentId)
    .eq("status", "scheduled")
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Học sinh đã có trong buổi học bù này" }, { status: 400 });

  const id = String(body.id || `mk_${Date.now()}`);
  const { data, error } = await supabase
    .from("official_makeup_plans")
    .insert({
      id,
      absence_id: absenceId,
      student_id: studentId,
      source_class_id: sourceClassId,
      source_session_key: body.sourceSessionKey || null,
      target_class_id: targetClassId,
      target_session_key: targetSessionKey,
      status: "scheduled",
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("official_absence_records").update({ status: "scheduled", updated_at: new Date().toISOString() }).eq("id", absenceId);

  return NextResponse.json({
    ok: true,
    plan: {
      id: data.id,
      absenceId: data.absence_id,
      studentId: data.student_id,
      sourceClassId: data.source_class_id,
      sourceSessionKey: data.source_session_key,
      targetClassId: data.target_class_id,
      targetSessionKey: data.target_session_key,
      status: data.status,
      createdBy: data.created_by,
      createdAt: data.created_at,
    },
  });
}
