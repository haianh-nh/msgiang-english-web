import { redirect } from "next/navigation";
import { requireUser, canTuition } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req:Request){
  const u=await requireUser();
  if(!canTuition(u)) throw new Error("No permission");
  const f=await req.formData();
  const month=String(f.get("month")||new Date().toISOString().slice(0,7));
  const student_id=String(f.get("student_id")||"");
  const action=String(f.get("action")||"paid");
  const amount=Number(f.get("amount")||0);
  const billable_sessions=Number(f.get("billable")||0);
  const note=String(f.get("note")||"");
  const now=new Date().toISOString();
  const base:any={student_id,month,amount,billable_sessions,note};
  if(action==="paid") { base.paid=true; base.paid_at=now; }
  if(action==="unpaid") { base.paid=false; base.paid_at=null; }
  if(action==="sent") { base.sent_at=now; }
  if(action==="unsent") { base.sent_at=null; }
  await supabaseAdmin().from("tuition_status").upsert(base,{onConflict:"student_id,month"});
  redirect(String(f.get("back")||`/tuition?month=${month}`));
}
