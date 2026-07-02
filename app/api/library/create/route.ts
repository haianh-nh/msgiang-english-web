import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
export async function POST(req:Request){
  const u=await requireUser();
  const f=await req.formData();
  const file=f.get("file") as File;
  const type=String(f.get("type")||"pdf");
  const buffer=Buffer.from(await file.arrayBuffer());
  const safeName=String(file.name||"file").replace(/[^\p{L}\p{N}._ -]/gu,"_");
  const path=`${type}/${Date.now()}-${safeName}`;
  const s=supabaseAdmin();
  await s.storage.from("exercise-library").upload(path,buffer,{contentType:file.type,upsert:false});
  await s.from("exercise_library").insert({
    type,
    title:f.get("title"),
    level:f.get("level"),
    skill:f.get("skill"),
    unit:f.get("unit"),
    description:f.get("description")||"",
    file_name:file.name,
    file_path:path,
    uploaded_by:u.id
  });
  redirect(`/library?type=${type}`);
}
