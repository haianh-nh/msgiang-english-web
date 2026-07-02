import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
export async function POST(req:Request){ const u=await requireUser(); if(!canManage(u)) throw new Error("No permission"); const f=await req.formData(); const s=supabaseAdmin(); const {data:dbu}=await s.from("app_users").select("password_hash").eq("id",u.id).single(); const ok=await bcrypt.compare(String(f.get("password")||""),dbu.password_hash); if(!ok) throw new Error("Sai mật khẩu xác nhận"); await s.from("classes").delete().eq("id",f.get("class_id")); redirect("/classes"); }
