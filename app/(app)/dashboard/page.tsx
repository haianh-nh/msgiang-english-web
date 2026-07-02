import { requireUser } from "@/lib/auth";
import { classesFor } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase";
import { makeupRows, pendingAbsences } from "@/lib/schedule";

export default async function Dashboard(){
  const user=await requireUser();
  const classes=await classesFor(user,user.role==="manager"?"mine":"all");
  const students=classes.reduce((s:any,c:any)=>s+(c.students?.length||0),0);
  const teachers=Array.from(new Set(classes.map((c:any)=>c.teachers?.name).filter(Boolean))).length;
  const active=classes.filter((c:any)=>c.status==="active").length;
  const weeklySessions=classes.reduce((s:any,c:any)=>s+(c.class_schedules?.length||0),0);
  const {count:docs}=await supabaseAdmin().from("exercise_library").select("*",{count:"exact",head:true});
  const makeups=await makeupRows();
  const absences=await pendingAbsences();

  return <>
    <div className="pageRibbon">
      <div className="pageHeader">
        <div className="headline">
          <h1>Xin chào, {user.name} 👋</h1>
          <p className="sub">Bản này đã bám lại demo V48: có logo/hình ảnh, thời khóa biểu tuần, học bù, lịch học 1–2 buổi/tuần, điểm danh kèm học bù và các trang quản trị chính.</p>
        </div>
        <div className="softHeroArt">
          <span>🗓️</span><span>🔁</span><span>✅</span><span>📚</span>
        </div>
      </div>
    </div>

    <div className="grid4">
      <div className="metricCard"><div className="metricAccent">🏫</div><div className="metricLabel">Lớp đang học</div><div className="metricValue">{active}</div><p className="metricHint">Lớp active</p></div>
      <div className="metricCard"><div className="metricAccent">🗓️</div><div className="metricLabel">Buổi học / tuần</div><div className="metricValue">{weeklySessions}</div><p className="metricHint">Từ lịch học của lớp</p></div>
      <div className="metricCard"><div className="metricAccent">🔁</div><div className="metricLabel">Học bù đã xếp</div><div className="metricValue">{makeups.length}</div><p className="metricHint">Kế hoạch học bù đang active</p></div>
      <div className="metricCard"><div className="metricAccent">🚫</div><div className="metricLabel">Vắng chờ xếp</div><div className="metricValue">{absences.length}</div><p className="metricHint">Lấy từ điểm danh vắng</p></div>
    </div>

    <div className="grid4">
      <div className="metricCard"><div className="metricAccent">🧒</div><div className="metricLabel">Học sinh</div><div className="metricValue">{students}</div><p className="metricHint">Tổng theo các lớp nhìn thấy</p></div>
      <div className="metricCard"><div className="metricAccent">👩‍🏫</div><div className="metricLabel">Giáo viên</div><div className="metricValue">{teachers}</div><p className="metricHint">Giáo viên phụ trách lớp</p></div>
      <div className="metricCard"><div className="metricAccent">📚</div><div className="metricLabel">Tài liệu</div><div className="metricValue">{docs||0}</div><p className="metricHint">PDF và audio trong thư viện</p></div>
      <div className="metricCard"><div className="metricAccent">💰</div><div className="metricLabel">Học phí</div><div className="metricValue">Ảnh</div><p className="metricHint">Tạo ảnh ngang gửi phụ huynh</p></div>
    </div>

    <div className="split">
      <section className="sectionCard">
        <div className="sectionHead"><div><h2 className="sectionTitle">Luồng thao tác chuẩn</h2><p className="sectionHint">Đây là thứ bản v3 còn thiếu so với demo.</p></div></div>
        <div className="todoGrid">
          <a className="todoItem" href="/schedule"><div className="todoIcon">🗓️</div><div><b>1. Xem thời khóa biểu</b><p>Xem tuần, trạng thái lớp, nghỉ học và xếp học bù.</p></div></a>
          <a className="todoItem" href="/attendance"><div className="todoIcon">✅</div><div><b>2. Điểm danh</b><p>Lưu Có mặt / Muộn / Vắng cho học sinh chính thức và học bù.</p></div></a>
          <a className="todoItem" href="/makeup"><div className="todoIcon">🔁</div><div><b>3. Theo dõi học bù</b><p>Lượt vắng chờ xếp và lịch học bù đã xếp.</p></div></a>
          <a className="todoItem" href="/tuition"><div className="todoIcon">💰</div><div><b>4. Học phí & đánh giá</b><p>Tạo ảnh gửi phụ huynh.</p></div></a>
        </div>
      </section>

      <section className="sectionCard">
        <div className="sectionHead"><div><h2 className="sectionTitle">Lớp học gần đây</h2><p className="sectionHint">Các lớp đang hiển thị theo quyền tài khoản.</p></div><span className="chip">{classes.length} lớp</span></div>
        <div className="studentList">
          {classes.slice(0,6).map((c:any)=><div key={c.id} className="studentItem">
            <div className="classHeadLeft">
              <div className="classBadgeLarge" style={{width:48,height:48,borderRadius:18,fontSize:18}}>{String(c.name).slice(0,2)}</div>
              <div><div className="strong">{c.name}</div><div className="mini">GV: {c.teachers?.name||"-"} • {c.students?.length||0} học sinh • {c.class_schedules?.length||0} buổi/tuần</div></div>
            </div>
            <span className={`pill ${c.status==="active"?"greenP":"gray"}`}>{c.status==="active"?"Đang học":"Đã học"}</span>
          </div>)}
          {!classes.length && <div className="empty">Chưa có dữ liệu lớp học.</div>}
        </div>
      </section>
    </div>
  </>
}
