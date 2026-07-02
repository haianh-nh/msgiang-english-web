import { redirect } from "next/navigation";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req:Request){
  const u=await requireUser(); if(!canManage(u)) throw new Error("No permission");
  const f=await req.formData(); const s=supabaseAdmin();
  const absence=String(f.get("absence")||"");
  let studentId=String(f.get("student_id")||"");
  let sourceClassId=String(f.get("source_class_id")||"");
  let sourceDate=String(f.get("source_session_date")||"");
  if(absence.includes("|")){
    const parts=absence.split("|");
    studentId=parts[0]; sourceClassId=parts[1]; sourceDate=parts[2];
  }
  await s.from("makeup_plans").insert({
    student_id:studentId,
    source_class_id:sourceClassId,
    source_session_date:sourceDate,
    target_class_id:String(f.get("target_class_id")),
    target_session_date:String(f.get("target_session_date")),
    target_start_time:String(f.get("target_start_time")||""),
    target_end_time:String(f.get("target_end_time")||""),
    note:String(f.get("note")||""),
    status:"planned"
  });
  redirect(String(f.get("back")||"/makeup"));
}
