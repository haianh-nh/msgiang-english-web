"use client";
import {useState} from "react";
export default function LoginForm(){
  const [phone,setPhone]=useState("admin"), [password,setPassword]=useState("123456"), [err,setErr]=useState("");
  async function submit(e:React.FormEvent){ e.preventDefault(); setErr(""); const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone,password})}); const j=await r.json(); if(!r.ok) return setErr(j.error||"Lỗi đăng nhập"); location.href=j.mustChange?"/change-password":"/dashboard"; }
  return <form className="loginCard" onSubmit={submit}><h2>Đăng nhập</h2><label>Tài khoản/SĐT<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label style={{marginTop:12}}>Mật khẩu<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{err&&<p className="red pill">{err}</p>}<button className="primary" style={{width:"100%",marginTop:16}}>Đăng nhập</button></form>
}
