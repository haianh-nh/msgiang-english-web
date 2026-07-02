import { redirect } from "next/navigation";
import { requireUser, canTuition } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
export async function POST(req:Request){
  const u=await requireUser(); if(!canTuition(u)) throw new Error("No permission");
  const f=await req.formData();
  const month=String(f.get("month")||"2026-06");
  await supabaseAdmin().from("tuition_status").upsert({
    student_id:f.get("student_id"),month,paid:true,paid_at:new Date().toISOString(),
    amount:Number(f.get("amount")||0),billable_sessions:Number(f.get("billable")||0)
  },{onConflict:"student_id,month"});
  redirect(String(f.get("back")||`/tuition?month=${month}`));
}
