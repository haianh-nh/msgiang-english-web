import { redirect } from "next/navigation";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { gradeOf } from "@/lib/data";

export async function POST(req:Request){
  const u=await requireUser(); if(!canManage(u)) throw new Error("No permission");
  const f=await req.formData(); const s=supabaseAdmin();
  const source=String(f.get("source_class_id"));
  const name=String(f.get("new_class_name")||"").trim();
  const insert:any={name,grade:gradeOf(name),teacher_id:f.get("teacher_id"),start_date:f.get("start_date"),status:"active"};
  const assistant=String(f.get("assistant_teacher_id")||"");
  if(assistant) insert.assistant_teacher_id=assistant;
  const {data:newClass}=await s.from("classes").insert(insert).select("id").single();
  const schedules:any[]=[{class_id:newClass.id,day_of_week:Number(f.get("day_of_week")),start_time:f.get("start_time"),end_time:f.get("end_time")}];
  const day2=String(f.get("day_of_week_2")||"");
  if(day2) schedules.push({class_id:newClass.id,day_of_week:Number(day2),start_time:f.get("start_time_2")||f.get("start_time"),end_time:f.get("end_time_2")||f.get("end_time")});
  await s.from("class_schedules").insert(schedules);
  const {data:students}=await s.from("students").select("*").eq("class_id",source);
  if(students?.length){
    await s.from("students").insert(students.map((x:any)=>({name:x.name,parent_name:x.parent_name,parent_phone:x.parent_phone,contact_note:x.contact_note,status:"active",class_id:newClass.id})));
  }
  await s.from("classes").update({status:"ended",end_date:new Date().toISOString().slice(0,10)}).eq("id",source);
  redirect("/classes");
}
