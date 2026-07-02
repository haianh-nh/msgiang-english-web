import { requireUser, canManage } from "@/lib/auth";
import { classesFor, teachers, gradeOf } from "@/lib/data";
import { dayName } from "@/lib/schedule";

export default async function Classes({searchParams}:{searchParams:Promise<any>}){
  const user=await requireUser();
  const sp=await searchParams;
  const scope=user.role==="manager"?(sp.scope||"mine"):"all";
  const cls=await classesFor(user,scope);
  const ts=await teachers();
  const active=cls.filter((c:any)=>c.status==="active");
  const ended=cls.filter((c:any)=>c.status==="ended");

  return <>
    <div className="pageRibbon">
      <div className="pageHeader">
        <div className="headline">
          <h1>Lớp học</h1>
          <p className="sub">Quản lí lớp đang học, lịch học 1–2 buổi/tuần, học sinh, chuyển lớp và kết thúc lớp. Phần này đã bổ sung lịch học giống demo V48 hơn.</p>
        </div>
        {user.role==="manager"&&<div className="segmented">
          <a className={`chip ${scope==="mine"?"active":""}`} href="/classes?scope=mine">Chỉ lớp mình dạy</a>
          <a className={`chip ${scope==="all"?"active":""}`} href="/classes?scope=all">Tất cả lớp</a>
        </div>}
      </div>
    </div>

    <div className="grid4">
      <div className="metricCard"><div className="metricAccent">📘</div><div className="metricLabel">Lớp đang học</div><div className="metricValue">{active.length}</div><p className="metricHint">Lớp active</p></div>
      <div className="metricCard"><div className="metricAccent">🗂️</div><div className="metricLabel">Lớp đã học</div><div className="metricValue">{ended.length}</div><p className="metricHint">Lịch sử lớp đã kết thúc</p></div>
      <div className="metricCard"><div className="metricAccent">🧒</div><div className="metricLabel">Tổng học sinh</div><div className="metricValue">{cls.reduce((n:any,c:any)=>n+(c.students?.length||0),0)}</div><p className="metricHint">Theo lớp đang hiển thị</p></div>
      <div className="metricCard"><div className="metricAccent">🗓️</div><div className="metricLabel">Buổi/tuần</div><div className="metricValue">{cls.reduce((n:any,c:any)=>n+(c.class_schedules?.length||0),0)}</div><p className="metricHint">Từ lịch học của lớp</p></div>
    </div>

    {canManage(user)&&<details className="panel modalLike">
      <summary className="summaryLink"><span>➕ Tạo lớp mới có lịch học</span><span className="pill red">1 hoặc 2 buổi/tuần</span></summary>
      <div className="formCard"><ClassForm teachers={ts}/></div>
    </details>}

    <Section title="Lớp đang học" classes={active} teachers={ts} can={canManage(user)} />
    <Section title="Lớp đã học" classes={ended} teachers={ts} can={canManage(user)} ended />
  </>
}

function ClassForm({teachers}:{teachers:any[]}){
  return <form className="form" action="/api/classes/create" method="post" style={{marginTop:8}}>
    <label>Tên lớp<input name="name" required placeholder="Ví dụ: G3.1"/></label>
    <label>Giáo viên chính<select name="teacher_id">{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label>Trợ giảng<select name="assistant_teacher_id" defaultValue=""><option value="">Không có</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label>Ngày bắt đầu<input name="start_date" type="date" required/></label>
    <div className="full demoNotice"><b>Lịch học chính</b></div>
    <label>Thứ buổi 1<select name="day_of_week"><option value="1">Thứ 2</option><option value="2">Thứ 3</option><option value="3">Thứ 4</option><option value="4">Thứ 5</option><option value="5">Thứ 6</option><option value="6">Thứ 7</option><option value="0">Chủ nhật</option></select></label>
    <label>Giờ bắt đầu buổi 1<input name="start_time" type="time" defaultValue="17:00"/></label>
    <label>Giờ kết thúc buổi 1<input name="end_time" type="time" defaultValue="18:30"/></label>
    <div className="full demoNotice"><b>Buổi 2 nếu có</b> — bỏ trống nếu lớp chỉ học 1 buổi/tuần.</div>
    <label>Thứ buổi 2<select name="day_of_week_2" defaultValue=""><option value="">Không có</option><option value="1">Thứ 2</option><option value="2">Thứ 3</option><option value="3">Thứ 4</option><option value="4">Thứ 5</option><option value="5">Thứ 6</option><option value="6">Thứ 7</option><option value="0">Chủ nhật</option></select></label>
    <label>Giờ bắt đầu buổi 2<input name="start_time_2" type="time" defaultValue="18:30"/></label>
    <label>Giờ kết thúc buổi 2<input name="end_time_2" type="time" defaultValue="20:00"/></label>
    <div className="full"><button className="primary">Lưu lớp mới</button></div>
  </form>
}

function ScheduleBadges({c}:{c:any}){
  const list=c.class_schedules||[];
  return <div className="chipRow">
    {list.map((s:any)=><span className="sessionTag" key={s.id}>{dayName(Number(s.day_of_week))} • {String(s.start_time).slice(0,5)}-{String(s.end_time).slice(0,5)}</span>)}
    {!list.length&&<span className="pill gray">Chưa có lịch học</span>}
  </div>
}

function Section({title,classes,teachers,can,ended=false}:any){
  return <section className="sectionCard">
    <div className="sectionHead"><div><h2 className="sectionTitle">{title}</h2><p className="sectionHint">{ended?"Lịch sử lớp đã kết thúc.":"Các lớp đang hoạt động và lịch học hằng tuần."}</p></div><span className="chip">{classes.length} lớp</span></div>
    <div className="classGrid">
      {classes.map((c:any)=><div className="card classCard" key={c.id}>
        <div className="classCardHead v3">
          <div className="classHeadLeft">
            <div className="classBadgeLarge">{String(c.name).slice(0,2)}</div>
            <div>
              <h3 className="className">{c.name}</h3>
              <div className="mini">GV: {c.teachers?.name||"-"} {c.assistant?.name?`• TA: ${c.assistant.name}`:c.assistant_name?`• TA: ${c.assistant_name}`:""} • {c.students?.length||0} học sinh • Bắt đầu: {c.start_date}</div>
            </div>
          </div>
          <div className="classMeta">
            <span className={`pill ${ended?"gray":"greenP"}`}>{ended?"Đã học":"Đang học"}</span>
            <span className="pill blue">{gradeOf(c.name)}</span>
          </div>
        </div>

        <div className="cardToolbar"><b>🗓️ Lịch học</b><ScheduleBadges c={c}/></div>

        <div>
          <div className="sectionHint" style={{marginBottom:8}}>Danh sách học sinh</div>
          <div className="studentList">
            {c.students?.map((s:any)=><div key={s.id} className="studentItem compact">
              <div><div className="strong">{s.name}</div><div className="mini">PH: {s.parent_phone || "Chưa có"}</div></div>
              {can&&<form action="/api/students/delete" method="post"><input type="hidden" name="student_id" value={s.id}/><button className="ghost smallBtn">Xóa</button></form>}
            </div>)}
            {!c.students?.length && <div className="empty">Chưa có học sinh trong lớp.</div>}
          </div>
        </div>

        {can&&!ended&&<details className="panel modalLike" style={{padding:14}}>
          <summary className="summaryLink"><span>👦 Thêm học sinh vào lớp</span><span className="pill red">Nội bộ</span></summary>
          <form className="form" action="/api/students/create" method="post">
            <input type="hidden" name="class_id" value={c.id}/>
            <label>Tên học sinh<input name="name" required/></label>
            <label>SĐT phụ huynh<input name="parent_phone"/></label>
            <div className="full"><button className="primary">Thêm học sinh</button></div>
          </form>
        </details>}

        {can&&!ended&&<details className="panel modalLike" style={{padding:14}}>
          <summary className="summaryLink"><span>🔁 Chuyển lớp / lên lớp</span><span className="pill orange">Có lịch mới</span></summary>
          <form className="form" action="/api/classes/promote" method="post">
            <input type="hidden" name="source_class_id" value={c.id}/>
            <label>Tên lớp mới<input name="new_class_name" required placeholder="Ví dụ: G4.1"/></label>
            <label>Giáo viên chính<select name="teacher_id">{teachers.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Trợ giảng<select name="assistant_teacher_id" defaultValue=""><option value="">Không có</option>{teachers.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label>Ngày bắt đầu<input type="date" name="start_date" required/></label>
            <label>Thứ buổi 1<select name="day_of_week"><option value="1">Thứ 2</option><option value="2">Thứ 3</option><option value="3">Thứ 4</option><option value="4">Thứ 5</option><option value="5">Thứ 6</option><option value="6">Thứ 7</option><option value="0">Chủ nhật</option></select></label>
            <label>Giờ bắt đầu<input type="time" name="start_time" defaultValue="17:00"/></label>
            <label>Giờ kết thúc<input type="time" name="end_time" defaultValue="18:30"/></label>
            <label>Thứ buổi 2<select name="day_of_week_2" defaultValue=""><option value="">Không có</option><option value="1">Thứ 2</option><option value="2">Thứ 3</option><option value="3">Thứ 4</option><option value="4">Thứ 5</option><option value="5">Thứ 6</option><option value="6">Thứ 7</option><option value="0">Chủ nhật</option></select></label>
            <label>Giờ bắt đầu buổi 2<input type="time" name="start_time_2" defaultValue="18:30"/></label>
            <label>Giờ kết thúc buổi 2<input type="time" name="end_time_2" defaultValue="20:00"/></label>
            <div className="full"><button className="primary">Tạo lớp mới & chuyển học sinh</button></div>
          </form>
        </details>}

        {can&&<details className="panel modalLike" style={{padding:14}}>
          <summary className="summaryLink"><span>🗑️ Xóa lớp</span><span className="pill red">Yêu cầu mật khẩu</span></summary>
          <form className="form" action="/api/classes/delete" method="post">
            <input type="hidden" name="class_id" value={c.id}/>
            <label className="full">Nhập mật khẩu xác nhận<input type="password" name="password" required/></label>
            <div className="full"><button className="danger">Xóa lớp</button></div>
          </form>
        </details>}
      </div>)}
    </div>
    {!classes.length&&<div className="empty">Chưa có lớp trong nhóm này.</div>}
  </section>
}
