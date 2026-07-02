import Sidebar from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({children}:{children:React.ReactNode}) {
  const user = await requireUser();
  return <div className="app">
    <Sidebar user={user}/>
    <main className="main">
      <div className="mainWrap">
        <div className="topbar">
          <div className="topbarTitle">
            <h1>Ms.Giang English</h1>
            <p>Hệ thống quản lí trung tâm – bản thật nâng UI/UX theo demo V48</p>
          </div>
          <div className="topbarUser">
            <span className="rolePill">{user.role}</span>
            <div className="avatar">{String(user.name||"U").slice(0,1).toUpperCase()}</div>
          </div>
        </div>
        {children}
      </div>
    </main>
  </div>
}
