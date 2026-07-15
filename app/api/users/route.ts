import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, sanitizeUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";

const ALLOWED_ROLES = new Set(["admin", "manager", "receptionist", "teacher", "ta"]);

function normalizeRoles(value: any) {
  const roles = Array.isArray(value) ? value : [value].filter(Boolean);
  const clean = roles.map(String).filter((r) => ALLOWED_ROLES.has(r));
  return Array.from(new Set(clean.length ? clean : ["teacher"]));
}

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const { data, error } = await supabaseAdmin().from("official_users").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, users: (data || []).map(sanitizeUser) });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const roles = normalizeRoles(body.roles || body.role || "teacher");
  const tempPassword = String(body.password || Math.floor(100000 + Math.random() * 900000));

  if (!name || !phone) return NextResponse.json({ error: "Thiếu tên hoặc SĐT/tài khoản" }, { status: 400 });

  const password_hash = await hashPassword(tempPassword);
  const { data, error } = await supabaseAdmin()
    .from("official_users")
    .insert({ name, phone, email, roles, password_hash, must_change_password: true })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, user: sanitizeUser(data), tempPassword });
}

export async function PATCH(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Thiếu id tài khoản" }, { status: 400 });

  const update: any = {};
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.phone !== undefined) update.phone = String(body.phone).trim();
  if (body.email !== undefined) update.email = String(body.email).trim();
  if (body.status !== undefined) update.status = String(body.status);
  if (body.roles !== undefined || body.role !== undefined) update.roles = normalizeRoles(body.roles || body.role);
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin()
    .from("official_users")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, user: sanitizeUser(data) });
}
