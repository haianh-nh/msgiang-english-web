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

  const { data, error } = await supabaseAdmin()
    .from("official_class_makeup_sessions")
    .upsert({
      source_session_key: body.sourceSessionKey,
      class_id: body.classId,
      makeup_date: body.date,
      day_key: body.day,
      start_time: body.start,
      end_time: body.end,
      reason: body.reason || "Dạy bù",
      status: "active",
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "source_session_key" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    classMakeup: {
      id: data.id,
      classId: data.class_id,
      sourceSessionKey: data.source_session_key,
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
