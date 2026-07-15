import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";
import { createSessionResponse, sanitizeSettingsForUser, sanitizeUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AUTH_LOGIN_USER_SELECT } from "@/lib/db-selects";

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
  const normalized = normalizePhone(input);
  const candidates = Array.from(new Set([input, normalized].filter(Boolean)));

  // Phase 7K: query only the matching account instead of loading every active
  // user and filtering in Node.js. official_users.phone is unique/indexed.
  const { data: users, error } = await supabase
    .from("official_users")
    .select(AUTH_LOGIN_USER_SELECT)
    .eq("status", "active")
    .in("phone", candidates)
    .limit(2);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userRows: any[] = Array.isArray(users) ? (users as any[]) : [];
  const user: any = userRows.find((u: any) => String(u.phone || "") === input)
    || userRows.find((u: any) => normalizePhone(u.phone) === normalized);
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
