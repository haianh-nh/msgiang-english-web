import Sidebar from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
export default async function AppLayout({children}:{children:React.ReactNode}) {
  const user = await requireUser();
  return <div className="app"><Sidebar user={user}/><main className="main">{children}</main></div>
}
