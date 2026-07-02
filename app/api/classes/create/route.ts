import { redirect } from "next/navigation";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { gradeOf } from "@/lib/data";
export async function POST(req:Request){ const u=await requireUser(); if(!canManage(u)) throw new Error("No permission"); const f=await req.formData(); const s=supabaseAdmin(); const name=String(f.get("name")||"").trim(); const {data:exist}=await s.from("classes").select("id").eq("name",name).maybeSingle(); if(exist) throw new Error("Tên lớp đã tồn tại"); const {data:c}=await s.from("classes").insert({name,grade:gradeOf(name),teacher_id:f.get("teacher_id"),start_date:f.get("start_date"),status:"active"}).select("id").single(); await s.from("class_schedules").insert({class_id:c.id,day_of_week:Number(f.get("day_of_week")),start_time:f.get("start_time"),end_time:f.get("end_time")}); redirect("/classes"); }
