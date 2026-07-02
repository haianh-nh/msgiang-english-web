import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req:Request){
  await requireUser();
  const f=await req.formData();
  const id=String(f.get("id")||"");
  const type=String(f.get("type")||"pdf");
  await supabaseAdmin().from("exercise_library").update({
    title:String(f.get("title")||""),
    level:String(f.get("level")||""),
    skill:String(f.get("skill")||""),
    unit:String(f.get("unit")||""),
    description:String(f.get("description")||""),
    updated_at:new Date().toISOString()
  }).eq("id",id);
  redirect(`/library?type=${type}`);
}
