"use client";
import {useState} from "react";
export default function LoginForm(){
  const [phone,setPhone]=useState("admin"), [password,setPassword]=useState("123456"), [err,setErr]=useState("");
  async function submit(e:React.FormEvent){
    e.preventDefault(); setErr("");
    const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone,password})});
    const j=await r.json();
    if(!r.ok) return setErr(j.error||"Lỗi đăng nhập");
    location.href=j.mustChange?"/change-password":"/dashboard";
  }
  return <form className="loginCard" onSubmit={submit}>
    <h2 className="loginTitle">Đăng nhập</h2>
    <p className="loginSub">Dùng tài khoản nội bộ để truy cập hệ thống. Với bản test mặc định bạn có thể đăng nhập bằng admin.</p>
    <div className="quickAccount">
      <span>Demo admin: <b>admin</b></span>
      <span>Password: <b>123456</b></span>
    </div>
    <label>Tài khoản / SĐT<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Nhập số điện thoại hoặc username"/></label>
    <label style={{marginTop:12}}>Mật khẩu<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nhập mật khẩu"/></label>
    {err&&<p className="red pill footerGap">{err}</p>}
    <button className="primary" style={{width:"100%",marginTop:16}}>Đăng nhập</button>
    <div className="loginHelp">Nếu hệ thống yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên, bạn sẽ được chuyển sang trang đổi mật khẩu tự động.</div>
  </form>
}
