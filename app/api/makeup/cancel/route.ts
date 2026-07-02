import { redirect } from "next/navigation";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req:Request){
  const u=await requireUser(); if(!canManage(u)) throw new Error("No permission");
  const f=await req.formData(); const s=supabaseAdmin();
  await s.from("makeup_plans").update({status:"cancelled"}).eq("id",String(f.get("id")));
  redirect(String(f.get("back")||"/makeup"));
}
