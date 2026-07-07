import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  if (password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu mới tối thiểu 6 ký tự" }, { status: 400 });
  }

  const password_hash = await hashPassword(password);
  const { error } = await supabaseAdmin()
    .from("official_users")
    .update({ password_hash, must_change_password: false, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
