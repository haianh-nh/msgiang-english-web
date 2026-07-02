import { redirect } from "next/navigation";
import { requireUser, canTuition } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
export async function POST(req:Request){const u=await requireUser(); if(!canTuition(u)) throw new Error("No permission"); const f=await req.formData(); await supabaseAdmin().from("tuition_status").upsert({student_id:f.get("student_id"),month:"2026-06",paid:true,paid_at:new Date().toISOString()},{onConflict:"student_id,month"}); redirect("/tuition")}
