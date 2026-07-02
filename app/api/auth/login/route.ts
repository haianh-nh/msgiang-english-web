import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req:Request){
  const {phone,password}=await req.json();
  const supabase=supabaseAdmin();
  const {data:u}=await supabase.from("app_users").select("*").eq("phone",String(phone).trim()).single();
  if(!u || u.status!=="active") return NextResponse.json({error:"Sai thông tin đăng nhập"},{status:401});
  const ok=await bcrypt.compare(String(password||""),u.password_hash);
  if(!ok) return NextResponse.json({error:"Sai thông tin đăng nhập"},{status:401});
  const token=crypto.randomBytes(32).toString("hex");
  const expires=new Date(Date.now()+14*864e5);
  await supabase.from("app_sessions").insert({user_id:u.id,token,expires_at:expires.toISOString()});
  const res=NextResponse.json({ok:true,mustChange:u.must_change_password});
  res.cookies.set("msg_session",token,{httpOnly:true,sameSite:"lax",path:"/",expires});
  return res;
}
