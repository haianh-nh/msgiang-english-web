import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "./supabase";

export const SESSION_COOKIE = "msg_official_session";
export type OfficialRole = "admin" | "manager" | "teacher";

export function sanitizeUser(user: any) {
  if (!user) return null;
  const roles = Array.isArray(user.roles) ? user.roles : [user.role].filter(Boolean);
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email || "",
    roles,
    status: user.status,
    mustChangePassword: !!user.must_change_password,
  };
}

export function hasRole(user: any, role: OfficialRole) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.includes(role);
}

export function canAdmin(user: any) {
  return hasRole(user, "admin");
}

export function canManage(user: any) {
  return hasRole(user, "admin") || hasRole(user, "manager");
}

export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const supabase = supabaseAdmin();
  const { data: session } = await supabase
    .from("official_sessions")
    .select("expires_at, official_users(*)")
    .eq("token", token)
    .maybeSingle();

  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const user = Array.isArray(session.official_users)
    ? session.official_users[0]
    : session.official_users;

  if (!user || user.status !== "active") return null;
  return user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, response: null };
}

export async function requireAdmin() {
  const { user, response } = await requireUser();
  if (response) return { user: null, response };
  if (!canAdmin(user)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function createSessionResponse(userId: string, payload: any = {}) {
  const token = crypto.randomBytes(32).toString("hex");
  const days = Number(process.env.SESSION_DAYS || 14);
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await supabaseAdmin().from("official_sessions").insert({
    user_id: userId,
    token,
    expires_at: expires.toISOString(),
  });

  const res = NextResponse.json(payload);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
  return res;
}

export async function clearSession(req?: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    await supabaseAdmin().from("official_sessions").delete().eq("token", token);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
