import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "./supabase";

export const SESSION_COOKIE = "msg_official_session";
export type OfficialRole = "admin" | "manager" | "receptionist" | "teacher" | "ta";

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
  return hasRole(user, "admin") || hasRole(user, "manager") || hasRole(user, "receptionist");
}

// Tuition is intentionally stricter than general operations.
// Receptionists can manage center operations but must never access billing data.
export function canTuition(user: any) {
  return hasRole(user, "admin") || hasRole(user, "manager");
}

export function sanitizeSettingsForUser(settings: any, user: any) {
  if (!settings || typeof settings !== "object") return settings;
  if (canTuition(user)) return settings;
  const {
    tuition_per_session: _hiddenTuition,
    unitPrice: _hiddenUnitPrice,
    tuitionFilter: _hiddenTuitionFilter,
    ...safeSettings
  } = settings;
  return safeSettings;
}

// Removes billing-only data from saved UI snapshots before it reaches a
// non-billing account. This protects against stale snapshots created before a
// user was changed to the receptionist role.
const BILLING_STATE_KEYS = new Set([
  "tuitionRollup",
  "tuitionRollupMonth",
  "tuitionMessages",
  "tuitionMode",
  "tuitionState",
  "tuitionEnrollment",
  "tuitionPreview",
  "tuitionAdjustment",
  "tuitionRegularStartMonth",
  "enrollmentStartDate",
  "payments",
  "billing",
  "billingRows",
  "invoices",
  "unitPrice",
  "tuitionFilter",
  "tuition_per_session",
  "materialFee",
  "tuitionAmount",
  "baseTuition",
  "currentAmount",
  "creditAmount",
  "adjustmentAmount",
  "paid",
  "paidAt",
  "paidBy",
  "messageSent",
]);

export function sanitizeStateForUser(payload: any, user: any): any {
  if (payload == null || canTuition(user)) return payload;
  if (Array.isArray(payload)) return payload.map((item) => sanitizeStateForUser(item, user));
  if (typeof payload !== "object") return payload;

  const safe: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (BILLING_STATE_KEYS.has(key)) continue;
    safe[key] = sanitizeStateForUser(value, user);
  }
  return safe;
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
