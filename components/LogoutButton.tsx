"use client";
export default function LogoutButton(){
  return <form action="/api/auth/logout" method="post"><button className="ghost" style={{width:"100%"}}>Đăng xuất</button></form>
}
