import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
export async function POST(req:Request){await requireUser(); const f=await req.formData(); const keys=["listening","speaking","reading","writing","vocabulary","participation","homework"]; const p:any={student_id:f.get("student_id"),class_id:f.get("class_id"),month:"2026-06",comment:f.get("comment"),strengths:f.get("strengths"),improvements:f.get("improvements"),suggestion:f.get("suggestion"),status:f.get("status")||"draft",updated_at:new Date().toISOString()}; for(const k of keys)p[k]=Number(f.get(k)||3); await supabaseAdmin().from("evaluations").upsert(p,{onConflict:"student_id,month"}); redirect("/evaluations")}
