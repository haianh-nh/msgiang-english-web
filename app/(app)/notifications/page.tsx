import { requireUser } from "@/lib/auth";
import { classesFor } from "@/lib/data";
import { makeupRows, pendingAbsences } from "@/lib/schedule";
import { supabaseAdmin } from "@/lib/supabase";

export default async function Notifications(){
  const user=await requireUser();
  const classes=await classesFor(user,user.role==="manager"?"mine":"all");
  const absences=await pendingAbsences();
  const makeups=await makeupRows();
  const {count:docs}=await supabaseAdmin().from("exercise_library").select("*",{count:"exact",head:true});

  const items = user.role==="teacher" ? [
    {icon:"✅", title:"Điểm danh hôm nay", desc:"Kiểm tra các lớp cần điểm danh trong ngày.", href:"/attendance", tag:"Giáo viên"},
    {icon:"📊", title:"Đánh giá học sinh", desc:"Hoàn thiện đánh giá tháng cho học sinh trong lớp mình dạy.", href:"/evaluations", tag:"Đánh giá"},
    {icon:"📚", title:"Thư viện bài tập", desc:`Hiện có ${docs||0} tài liệu PDF/audio trong thư viện.`, href:"/library", tag:"Tài liệu"},
  ] : [
    {icon:"🔁", title:"Học bù cần xếp", desc:`Có ${absences.length} lượt vắng đang chờ xếp học bù.`, href:"/makeup", tag:"Học bù"},
    {icon:"🗓️", title:"Lịch dạy tuần", desc:`Có ${classes.reduce((n:any,c:any)=>n+(c.class_schedules?.length||0),0)} buổi học/tuần trong các lớp đang quản lí.`, href:"/schedule", tag:"Lịch"},
    {icon:"💰", title:"Học phí", desc:"Kiểm tra danh sách học phí và tạo ảnh thông báo cho phụ huynh.", href:"/tuition", tag:"Học phí"},
    {icon:"👩‍🏫", title:"Tài khoản giáo viên", desc:"Có thể tạo giáo viên/quản lí và reset mật khẩu tạm.", href:"/teachers", tag:"Tài khoản"},
  ];

  return <>
    <div className="pageRibbon">
      <div className="screenTitle">
        <div>
          <h1>Thông báo</h1>
          <p>Trang thông báo nội bộ giống demo: gợi ý nhanh các việc cần xử lý theo vai trò.</p>
        </div>
        <span className="chip active">{user.role}</span>
      </div>
    </div>

    <div className="grid2">
      {items.map((it,i)=><a className="todoItem" href={it.href} key={i}>
        <div className="todoIcon">{it.icon}</div>
        <div>
          <b>{it.title}</b>
          <p>{it.desc}</p>
          <div style={{marginTop:10}}><span className="pill blue">{it.tag}</span></div>
        </div>
      </a>)}
    </div>

    <div className="statGrid">
      <div className="stat"><div className="statIcon redgrad">🏫</div><div><h3>Lớp nhìn thấy</h3><strong>{classes.length}</strong><small>Theo quyền tài khoản</small></div></div>
      <div className="stat"><div className="statIcon bluegrad">🔁</div><div><h3>Học bù active</h3><strong>{makeups.length}</strong><small>Đã xếp</small></div></div>
      <div className="stat"><div className="statIcon yellowgrad">🚫</div><div><h3>Vắng chờ xếp</h3><strong>{absences.length}</strong><small>Cần xử lý</small></div></div>
      <div className="stat"><div className="statIcon greengrad">📚</div><div><h3>Tài liệu</h3><strong>{docs||0}</strong><small>PDF / Audio</small></div></div>
    </div>
  </>
}
