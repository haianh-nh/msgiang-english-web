import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { currentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
export async function POST(req:Request){
  const u=await currentUser(); if(!u) return NextResponse.json({error:"Chưa đăng nhập"},{status:401});
  const {password,confirm}=await req.json();
  if(!password || password.length<6) return NextResponse.json({error:"Mật khẩu tối thiểu 6 ký tự"},{status:400});
  if(password!==confirm) return NextResponse.json({error:"Hai mật khẩu chưa giống nhau"},{status:400});
  const hash=await bcrypt.hash(password,10);
  await supabaseAdmin().from("app_users").update({password_hash:hash,must_change_password:false}).eq("id",u.id);
  return NextResponse.json({ok:true});
}
