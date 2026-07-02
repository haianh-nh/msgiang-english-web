import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
export async function POST(){
  const token=(await cookies()).get("msg_session")?.value;
  if(token) await supabaseAdmin().from("app_sessions").delete().eq("token",token);
  const res=NextResponse.json({ok:true}); res.cookies.delete("msg_session"); return res;
}
