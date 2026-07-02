import { redirect } from "next/navigation";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req:Request){
  const u=await requireUser();
  if(!canManage(u)) throw new Error("No permission");
  const f=await req.formData();
  const class_id=String(f.get("class_id")||"");
  const teacher_id=String(f.get("teacher_id")||"");
  const assign_type=String(f.get("assign_type")||"main");
  const patch:any={};
  if(assign_type==="assistant") patch.assistant_teacher_id=teacher_id;
  else patch.teacher_id=teacher_id;
  await supabaseAdmin().from("classes").update(patch).eq("id",class_id);
  redirect(String(f.get("back")||"/teachers"));
}
