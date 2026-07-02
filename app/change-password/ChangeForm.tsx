"use client";
import {useState} from "react";
export default function ChangeForm(){
  const [p1,setP1]=useState(""), [p2,setP2]=useState(""), [err,setErr]=useState("");
  async function submit(e:React.FormEvent){ e.preventDefault(); const r=await fetch("/api/auth/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:p1,confirm:p2})}); const j=await r.json(); if(!r.ok) return setErr(j.error); location.href="/dashboard"; }
  return <form className="loginCard" onSubmit={submit}><h2>Mật khẩu mới</h2><label>Mật khẩu<input type="password" value={p1} onChange={e=>setP1(e.target.value)}/></label><label style={{marginTop:12}}>Nhập lại<input type="password" value={p2} onChange={e=>setP2(e.target.value)}/></label>{err&&<p className="red pill">{err}</p>}<button className="primary" style={{width:"100%",marginTop:16}}>Lưu</button></form>
}
