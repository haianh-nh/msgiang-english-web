import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
export async function POST(req:Request){
  await requireUser();
  const f=await req.formData();
  const s=supabaseAdmin();
  const path=String(f.get("file_path")||"");
  const type=String(f.get("type")||"pdf");
  if(path) await s.storage.from("exercise-library").remove([path]);
  await s.from("exercise_library").delete().eq("id",f.get("id"));
  redirect(`/library?type=${type}`);
}
