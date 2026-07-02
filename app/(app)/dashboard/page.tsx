import { requireUser } from "@/lib/auth";
import { classesFor } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase";
export default async function Dashboard(){
  const user=await requireUser(); const classes=await classesFor(user,user.role==="manager"?"mine":"all");
  const students=classes.reduce((s:any,c:any)=>s+(c.students?.length||0),0);
  const {count:docs}=await supabaseAdmin().from("exercise_library").select("*",{count:"exact",head:true});
  return <><h1>Xin chào, {user.name} 👋</h1><p className="sub">Tổng quan hệ thống vận hành nội bộ.</p><div className="grid"><div className="panel"><h3>Lớp</h3><h1>{classes.length}</h1></div><div className="panel"><h3>Học sinh</h3><h1>{students}</h1></div><div className="panel"><h3>Tài liệu</h3><h1>{docs||0}</h1></div></div></>
}
