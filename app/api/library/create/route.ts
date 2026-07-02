import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
export async function POST(req:Request){const u=await requireUser(); const f=await req.formData(); const file=f.get("file") as File; const type=String(f.get("type")||"pdf"); const buffer=Buffer.from(await file.arrayBuffer()); const path=`${type}/${Date.now()}-${file.name}`; const s=supabaseAdmin(); await s.storage.from("exercise-library").upload(path,buffer,{contentType:file.type,upsert:false}); await s.from("exercise_library").insert({type,title:f.get("title"),level:f.get("level"),skill:f.get("skill"),unit:f.get("unit"),file_name:file.name,file_path:path,uploaded_by:u.id}); redirect(`/library?type=${type}`)}
