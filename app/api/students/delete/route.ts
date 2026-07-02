import { redirect } from "next/navigation";
import { requireUser, canManage } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
export async function POST(req:Request){ const u=await requireUser(); if(!canManage(u)) throw new Error("No permission"); const f=await req.formData(); await supabaseAdmin().from("students").delete().eq("id",f.get("student_id")); redirect("/classes"); }
