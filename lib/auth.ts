import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "./supabase";

export type Role = "admin" | "manager" | "teacher";

export async function currentUser() {
  const token = (await cookies()).get("msg_session")?.value;
  if (!token) return null;
  const { data } = await supabaseAdmin()
    .from("app_sessions")
    .select("expires_at, app_users(id,name,phone,role,status,must_change_password)")
    .eq("token", token)
    .single();

  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  const u = Array.isArray(data.app_users) ? data.app_users[0] : data.app_users;
  if (!u || u.status !== "active") return null;
  return u;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.must_change_password) redirect("/change-password");
  return u;
}

export function canManage(u:any) {
  return u.role === "admin" || u.role === "manager";
}

export function canTuition(u:any) {
  return u.role === "admin" || u.role === "manager";
}
