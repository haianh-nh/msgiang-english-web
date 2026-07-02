"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default function Sidebar({user}:{user:any}) {
  const pathname = usePathname();
  const items = [
    ["dashboard","🏠","Tổng quan"],
    ["schedule","📅","Lịch dạy"],
    ["classes","🏫","Lớp học"],
    ["attendance","✅","Điểm danh"],
    ["makeup","🔁","Học bù"],
    ["evaluations","📊","Đánh giá"],
    ["library","📚","Thư viện bài tập"],
    ["notifications","🔔","Thông báo"],
  ];
  if(user.role !== "teacher") items.splice(5,0,["tuition","💰","Học phí"]);
  if(user.role !== "teacher") items.push(["teachers","👩‍🏫","Giáo viên"],["settings","⚙️","Cài đặt"]);

  return <aside className="side">
    <div className="brandCard">
      <div className="brandTop">
        <img className="brandLogoImg" src="/logo.png" alt="Ms.Giang"/>
        <div>
          <div className="brand">Ms.Giang</div>
          <div className="brandMini">English Center</div>
        </div>
      </div>
    </div>

    <div className="profileMini">
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div className="avatar">{String(user.name||"U").slice(0,1).toUpperCase()}</div>
        <div>
          <div style={{fontWeight:900}}>{user.name}</div>
          <div className="mini">{user.phone || "Tài khoản nội bộ"}</div>
        </div>
      </div>
      <span className="rolePill">{user.role}</span>
    </div>

    <nav className="nav">
      {items.map(i=>{
        const href = "/"+i[0];
        const active = pathname === href;
        return <Link key={i[0]} href={href} className={`navItem ${active ? "active" : ""}`}>
          <span className="navEmoji">{i[1]}</span>
          <span>{i[2]}</span>
        </Link>
      })}
    </nav>

    <div className="sideFoot">
      <div className="tipCard">
        <b style={{color:"#9f1239"}}>Bản demo parity</b>
        <div>Đã bổ sung logo, thời khóa biểu, học bù, lịch học và các thao tác giống demo V48 hơn.</div>
      </div>
      <LogoutButton />
    </div>
  </aside>
}
