import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
function temp(){return String(Math.floor(100000+Math.random()*900000))}
export async function POST(req:Request){const u=await requireUser(); if(!canManage(u)) throw new Error("No permission"); const f=await req.formData(); const pw=temp(), hash=await bcrypt.hash(pw,10); await supabaseAdmin().from("app_users").update({password_hash:hash,must_change_password:true}).eq("id",f.get("user_id")); redirect(`/teachers?temp=${pw}`)}
