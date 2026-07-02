import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
function temp(){return String(Math.floor(100000+Math.random()*900000))}

export async function POST(req:Request){
  const u=await requireUser();
  if(!canManage(u)) throw new Error("No permission");
  const f=await req.formData();
  let role=String(f.get("role")||"teacher");
  if(u.role!=="admin"&&role==="admin") role="manager";
  const name=String(f.get("name")||"").trim();
  const phone=String(f.get("phone")||"").trim();
  const email=String(f.get("email")||"").trim();
  const note=String(f.get("note")||"").trim();
  const pw=temp(), hash=await bcrypt.hash(pw,10);
  const s=supabaseAdmin();
  let {data:appUser}=await s.from("app_users").select("id").eq("phone",phone).maybeSingle();
  if(appUser){
    await s.from("app_users").update({name,role,status:"active",password_hash:hash,must_change_password:true}).eq("id",appUser.id);
  }else{
    const r=await s.from("app_users").insert({name,phone,role,password_hash:hash,must_change_password:true}).select("id").single();
    appUser=r.data;
  }
  const {data:teacher}=await s.from("teachers").select("id").eq("phone",phone).maybeSingle();
  if(teacher){
    await s.from("teachers").update({user_id:appUser.id,name,phone,role,status:"active",email,note,updated_at:new Date().toISOString()}).eq("id",teacher.id);
  }else{
    await s.from("teachers").insert({user_id:appUser.id,name,phone,role,status:"active",email,note});
  }
  redirect(`/teachers?temp=${pw}&name=${encodeURIComponent(name)}`);
}
