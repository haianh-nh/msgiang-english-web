import { NextResponse } from "next/server";
import { requireUser, canAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST() {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!canAdmin(user)) return NextResponse.json({ error: "Chỉ Admin được dọn phiên đăng nhập" }, { status: 403 });

  const { data, error } = await supabaseAdmin()
    .from("official_sessions")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: data?.length || 0 });
}
