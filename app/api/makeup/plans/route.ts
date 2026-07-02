import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { gradeOf } from "@/lib/classes";

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
    return NextResponse.json({ error: "Chỉ được xếp học bù sang lớp khác" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: classes, error: ce } = await supabase.from("official_classes").select("id,name").in("id", [targetClassId, sourceClassId]);
  if (ce) return NextResponse.json({ error: ce.message }, { status: 500 });
  const targetClass = (classes || []).find((c: any) => c.id === targetClassId);
  const sourceClass = (classes || []).find((c: any) => c.id === sourceClassId);
  if (!targetClass || !sourceClass) return NextResponse.json({ error: "Không tìm thấy lớp" }, { status: 404 });
  if (gradeOf(targetClass.name) !== gradeOf(sourceClass.name)) {
    return NextResponse.json({ error: "Chỉ được xếp học bù cùng khối" }, { status: 400 });
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
    .neq("status", "cancelled");
  if (me) return NextResponse.json({ error: me.message }, { status: 500 });

  if ((officialCount || 0) + (makeupCount || 0) >= capacity) {
    return NextResponse.json({ error: `Buổi này đã đủ ${capacity} học sinh` }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("official_makeup_plans")
    .select("id,status")
    .eq("target_session_key", targetSessionKey)
    .eq("student_id", studentId)
    .neq("status", "cancelled")
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
