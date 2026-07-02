"use client";
export default function LogoutButton(){
  async function out(){ await fetch("/api/auth/logout",{method:"POST"}); location.href="/login"; }
  return <button className="ghost" onClick={out}>Đăng xuất</button>
}
