import { redirect } from "next/navigation";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req:Request){
  const u=await requireUser();
  if(!canManage(u)) throw new Error("No permission");
  const f=await req.formData();
  const id=String(f.get("teacher_id")||"");
  let role=String(f.get("role")||"teacher");
  if(u.role!=="admin" && role==="admin") role="manager";
  const patch:any={
    name:String(f.get("name")||""),
    phone:String(f.get("phone")||""),
    role,
    status:String(f.get("status")||"active"),
    email:String(f.get("email")||""),
    note:String(f.get("note")||""),
    updated_at:new Date().toISOString()
  };
  const s=supabaseAdmin();
  const {data:t}=await s.from("teachers").select("user_id").eq("id",id).single();
  await s.from("teachers").update(patch).eq("id",id);
  if(t?.user_id){
    await s.from("app_users").update({name:patch.name,phone:patch.phone,role:patch.role,status:patch.status}).eq("id",t.user_id);
  }
  redirect("/teachers");
}
