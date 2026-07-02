import { redirect } from "next/navigation";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req:Request){
  const u=await requireUser(); if(!canManage(u)) throw new Error("No permission");
  const f=await req.formData(); const s=supabaseAdmin();
  await s.from("session_cancellations").upsert({
    class_id:String(f.get("class_id")),
    session_date:String(f.get("session_date")),
    start_time:String(f.get("start_time")),
    end_time:String(f.get("end_time")),
    reason:String(f.get("reason")||"Nghỉ buổi học"),
    status:"cancelled"
  },{onConflict:"class_id,session_date,start_time"});
  redirect(`/schedule?week=${String(f.get("week")||"")}`);
}
