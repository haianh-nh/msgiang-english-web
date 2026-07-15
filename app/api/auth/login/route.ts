import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";
import { createSessionResponse, sanitizeSettingsForUser, sanitizeUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

function normalizePhone(v: string) {
  return String(v || "").replace(/\s+/g, "").replace(/^\+84/, "0");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = String(body.phone || body.username || "").trim();
  const password = String(body.password || "");

  if (!input || !password) {
    return NextResponse.json({ error: "Thiếu tài khoản hoặc mật khẩu" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: users, error } = await supabase.from("official_users").select("*").eq("status", "active");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const normalized = normalizePhone(input);
  const user = (users || []).find((u: any) => u.phone === input || normalizePhone(u.phone) === normalized);
  if (!user) return NextResponse.json({ error: "Sai thông tin đăng nhập" }, { status: 401 });

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return NextResponse.json({ error: "Sai thông tin đăng nhập" }, { status: 401 });

  const settings = await getSettings();
  return createSessionResponse(user.id, {
    ok: true,
    user: sanitizeUser(user),
    settings: sanitizeSettingsForUser(settings, user),
  });
}
