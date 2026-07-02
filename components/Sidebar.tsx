import Link from "next/link";
import LogoutButton from "./LogoutButton";
export default function Sidebar({user}:{user:any}) {
  const items = [["dashboard","🏠","Tổng quan"],["classes","🏫","Lớp học"],["attendance","✅","Điểm danh"],["evaluations","📊","Đánh giá"],["library","📚","Thư viện"]];
  if(user.role !== "teacher") items.splice(3,0,["tuition","💰","Học phí"]);
  if(user.role !== "teacher") items.push(["teachers","👩‍🏫","Giáo viên"],["settings","⚙️","Cài đặt"]);
  return <aside className="side"><div className="brand">Ms.Giang English</div><p className="mini">{user.name}<br/>{user.role}</p><nav className="nav">{items.map(i=><Link key={i[0]} href={"/"+i[0]}>{i[1]} {i[2]}</Link>)}</nav><div style={{marginTop:24}}><LogoutButton/></div></aside>
}
