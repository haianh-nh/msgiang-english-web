import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền xếp lịch dạy bù" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (!body.sourceSessionKey || !body.classId || !body.date) {
    return NextResponse.json({ error: "Thiếu thông tin lịch dạy bù" }, { status: 400 });
  }

  const teacherId = String(body.teacherId || body.teacher_id || "").trim() || null;

  const { data, error } = await supabaseAdmin()
    .from("official_class_makeup_sessions")
    .upsert({
      source_session_key: body.sourceSessionKey,
      class_id: body.classId,
      teacher_id: teacherId,
      makeup_date: body.date,
      day_key: body.day,
      start_time: body.start,
      end_time: body.end,
      reason: body.reason || "Dạy bù",
      status: "active",
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "source_session_key" })
    .select("*, makeup_teacher:teacher_id(id,name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    classMakeup: {
      id: data.id,
      classId: data.class_id,
      sourceSessionKey: data.source_session_key,
      teacherId: data.teacher_id || null,
      teacher: data.makeup_teacher?.name || body.teacherName || "",
      date: data.makeup_date,
      day: data.day_key,
      start: String(data.start_time || "").slice(0, 5),
      end: String(data.end_time || "").slice(0, 5),
      reason: data.reason,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}


function makeupAttendanceSessionKey(row: any) {
  const start = String(row.start_time || "").slice(0, 5);
  const end = String(row.end_time || "").slice(0, 5);
  return `${row.class_id}|${row.makeup_date}|${row.day_key}|${start}-${end}`;
}

export async function DELETE(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền hủy lịch dạy bù" }, { status: 403 });

  const url = new URL(req.url);
  const sourceSessionKey = String(url.searchParams.get("sourceSessionKey") || "");
  if (!sourceSessionKey) return NextResponse.json({ error: "Thiếu sourceSessionKey" }, { status: 400 });

  const supabase = supabaseAdmin();

  const { data: rows, error: findError } = await supabase
    .from("official_class_makeup_sessions")
    .select("id, class_id, source_session_key, makeup_date, day_key, start_time, end_time, status")
    .eq("source_session_key", sourceSessionKey)
    .neq("status", "cancelled");

  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });

  const activeRows = rows || [];
  if (!activeRows.length) return NextResponse.json({ ok: true, cancelled: false });

  const attendanceKeys = activeRows.map(makeupAttendanceSessionKey).filter(Boolean);
  if (attendanceKeys.length) {
    const { data: attended, error: attError } = await supabase
      .from("official_attendance_sessions")
      .select("session_key, saved")
      .in("session_key", attendanceKeys)
      .eq("saved", true)
      .limit(1);

    if (attError) return NextResponse.json({ error: attError.message }, { status: 500 });
    if ((attended || []).length) {
      return NextResponse.json({
        error: "Buổi dạy bù này đã có điểm danh, không thể hủy dạy bù."
      }, { status: 409 });
    }
  }

  const { error } = await supabase
    .from("official_class_makeup_sessions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("source_session_key", sourceSessionKey)
    .neq("status", "cancelled");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    cancelled: true,
    sourceSessionKey,
    cancelledIds: activeRows.map((r:any)=>r.id),
  });
}
