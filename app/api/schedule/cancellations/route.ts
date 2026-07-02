import { NextRequest, NextResponse } from "next/server";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền cho nghỉ buổi học" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const sessionKey = String(body.sessionKey || "");
  if (!sessionKey) return NextResponse.json({ error: "Thiếu sessionKey" }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("official_session_cancellations")
    .upsert({
      session_key: sessionKey,
      class_id: body.classId,
      session_date: body.date,
      day_key: body.day,
      start_time: body.start,
      end_time: body.end,
      reason: body.reason || "Nghỉ buổi học",
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    cancellation: {
      sessionKey: data.session_key,
      classId: data.class_id,
      date: data.session_date,
      day: data.day_key,
      start: String(data.start_time || "").slice(0, 5),
      end: String(data.end_time || "").slice(0, 5),
      reason: data.reason,
      createdAt: data.created_at,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canManage(user)) return NextResponse.json({ error: "Không có quyền mở lại buổi học" }, { status: 403 });

  const url = new URL(req.url);
  const sessionKey = url.searchParams.get("sessionKey") || "";
  if (!sessionKey) return NextResponse.json({ error: "Thiếu sessionKey" }, { status: 400 });

  const { error } = await supabaseAdmin().from("official_session_cancellations").delete().eq("session_key", sessionKey);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
