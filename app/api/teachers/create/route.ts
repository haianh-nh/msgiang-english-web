import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
function temp(){return String(Math.floor(100000+Math.random()*900000))}
export async function POST(req:Request){const u=await requireUser(); if(!canManage(u)) throw new Error("No permission"); const f=await req.formData(); let role=String(f.get("role")||"teacher"); if(u.role!=="admin"&&role==="admin") role="manager"; const pw=temp(), hash=await bcrypt.hash(pw,10); const s=supabaseAdmin(); const {data:user}=await s.from("app_users").insert({name:f.get("name"),phone:f.get("phone"),role,password_hash:hash,must_change_password:true}).select("id").single(); await s.from("teachers").insert({user_id:user.id,name:f.get("name"),phone:f.get("phone"),role}); redirect(`/teachers?temp=${pw}`)}
