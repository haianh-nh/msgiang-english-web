import { requireUser, canManage } from "@/lib/auth";
import { classesFor, teachers } from "@/lib/data";
import { WEEK_DAYS, iso, mondayOf, parseDate, addDays, weekLabel, dateForDay, timeSlot, formatVN, dayName, sessionStatus, cancellationRows, makeupRows, pendingAbsences } from "@/lib/schedule";

function classActiveOn(c:any, date:string){
  return c.status==="active" && date >= c.start_date && (!c.end_date || date <= c.end_date);
}
function cancelKey(classId:string,date:string,start:string){ return `${classId}|${date}|${String(start).slice(0,5)}`; }
function sessionKey(s:any){ return `${s.classId}|${s.date}|${s.start}`; }

export default async function Schedule({searchParams}:{searchParams:Promise<any>}){
  const user=await requireUser();
  const sp=await searchParams;
  const scope=user.role==="manager"?(sp.scope||"mine"):"all";
  const week=iso(mondayOf(parseDate(sp.week)));
  const prev=iso(addDays(parseDate(week),-7));
  const next=iso(addDays(parseDate(week),7));
  const cls=await classesFor(user,scope);
  const ts=await teachers();
  const cancels=await cancellationRows();
  const makeups=await makeupRows();
  const pending=await pendingAbsences();

  const cancelSet=new Map(cancels.map((x:any)=>[cancelKey(x.class_id,x.session_date,x.start_time),x]));
  const sessions:any[]=[];
  for(const c of cls){
    for(const sc of c.class_schedules||[]){
      const date=dateForDay(week, Number(sc.day_of_week));
      if(!classActiveOn(c,date)) continue;
      const cancelled=cancelSet.get(cancelKey(c.id,date,sc.start_time));
      const st=sessionStatus(date,sc.start_time,sc.end_time,!!cancelled);
      const plans=makeups.filter((m:any)=>m.target_class_id===c.id && m.target_session_date===date && String(m.target_start_time||"").slice(0,5)===String(sc.start_time).slice(0,5));
      sessions.push({
        classId:c.id, className:c.name, grade:c.grade, teacher:c.teachers?.name, ta:c.assistant_name,
        students:c.students?.length||0, day:Number(sc.day_of_week), date,
        start:String(sc.start_time).slice(0,5), end:String(sc.end_time).slice(0,5),
        slot:timeSlot(sc.start_time,sc.end_time), status:st, cancelled, plans
      });
    }
  }
  const slots=Array.from(new Set(sessions.map(s=>s.slot))).sort();
  const counts={
    done:sessions.filter(s=>s.status.key==="done").length,
    live:sessions.filter(s=>s.status.key==="live").length,
    todo:sessions.filter(s=>s.status.key==="todo").length,
    cancelled:sessions.filter(s=>s.status.key==="cancelled").length
  };

  return <>
    <div className="pageRibbon">
      <div className="screenTitle">
        <div>
          <h1>Thời khóa biểu tuần</h1>
          <p>{weekLabel(week)} • Lịch học, trạng thái buổi, nghỉ học, xếp học bù giống demo V48.</p>
        </div>
        {canManage(user)&&<a className="btn primary" href="/classes">+ Tạo lớp mới</a>}
      </div>
    </div>

    {user.role==="manager"&&<div className="segmented">
      <a className={`chip ${scope==="mine"?"active":""}`} href={`/schedule?scope=mine&week=${week}`}>Chỉ lớp mình dạy</a>
      <a className={`chip ${scope==="all"?"active":""}`} href={`/schedule?scope=all&week=${week}`}>Tất cả lớp</a>
    </div>}

    <div className="weekToolbar">
      <div className="weekPicker">
        <a className="btn ghost" href={`/schedule?scope=${scope}&week=${prev}`}>‹ Tuần trước</a>
        <span className="weekRange">{weekLabel(week)}</span>
        <a className="btn ghost" href={`/schedule?scope=${scope}&week=${next}`}>Tuần sau ›</a>
        <form><input type="hidden" name="scope" value={scope}/><input className="input" type="date" name="week" defaultValue={week}/><button className="primary">Mở</button></form>
      </div>
      <div className="weekLegend">
        <span className="pill greenP">Đã dạy: {counts.done}</span>
        <span className="pill orange">Đang dạy: {counts.live}</span>
        <span className="pill blue">Chưa dạy: {counts.todo}</span>
        <span className="pill gray">Nghỉ: {counts.cancelled}</span>
        <span className="pill red">{cls.length} lớp</span>
      </div>
    </div>

    <div className="timetableShell">
      <table className="timetable">
        <thead><tr><th className="timeCol">Khung giờ</th>{WEEK_DAYS.map(d=><th key={d.key}>{d.label}<div className="mini">{formatVN(dateForDay(week,d.key))}</div></th>)}</tr></thead>
        <tbody>
          {slots.map(slot=><tr key={slot}>
            <td className="timeCol">{slot.replace("-"," - ")}</td>
            {WEEK_DAYS.map(d=>{
              const daySessions=sessions.filter(s=>s.slot===slot && s.day===d.key);
              return <td className="scheduleCell" key={d.key}>{daySessions.length?daySessions.map((s,i)=><LessonCard key={sessionKey(s)} s={s} week={week} can={canManage(user)} pending={pending} teachers={ts}/>):<div className="emptySlot">Trống</div>}</td>
            })}
          </tr>)}
        </tbody>
      </table>
    </div>

    <div className="mobileScheduleList">
      {WEEK_DAYS.map(d=><div className="dayMobileCard" key={d.key}>
        <div className="sectionHead"><div><h2 className="sectionTitle">{d.label}</h2><p className="sectionHint">{formatVN(dateForDay(week,d.key))}</p></div></div>
        {sessions.filter(s=>s.day===d.key).map(s=><LessonCard key={sessionKey(s)} s={s} week={week} can={canManage(user)} pending={pending} teachers={ts}/>)}
        {!sessions.filter(s=>s.day===d.key).length&&<div className="emptySlot">Trống</div>}
      </div>)}
    </div>

    {!sessions.length&&<div className="empty">Chưa có dữ liệu lịch học. Hãy tạo lớp và thêm lịch học trong trang Lớp học.</div>}
  </>
}

function LessonCard({s,week,can,pending,teachers}:{s:any,week:string,can:boolean,pending:any[],teachers:any[]}){
  const sameGradePending = pending.filter((p:any)=>p.class?.grade===s.grade && p.class?.id!==s.classId);
  const total = s.students + s.plans.length;
  return <div className={`lessonCard strict${s.status.key[0].toUpperCase()+s.status.key.slice(1)} ${s.status.key==="cancelled"?"cancelledCard":""}`}>
    <b>{s.className}</b>
    <span className={`statusDot2 ${s.status.key}`}>{s.status.label}</span>
    <div className="mini">{s.start} - {s.end} • {s.teacher||"-"} {s.ta?`• TA: ${s.ta}`:""}</div>
    <div className="mini">{s.students} chính thức • {s.plans.length} học bù • Tổng {total}/15</div>
    <div className="strictStateLine">
      <span className={`capacityBadge ${total>=15?"full":""}`}>Sức chứa {total}/15</span>
      {s.plans.length>0&&<span className="makeupBadge">{s.plans.length} học bù</span>}
    </div>

    {s.status.key==="cancelled" ? <div className="strictStateLine">
      <span className="pill gray">{s.cancelled?.reason||"Nghỉ buổi học"}</span>
      {can&&<form action="/api/schedule/uncancel" method="post">
        <input type="hidden" name="class_id" value={s.classId}/><input type="hidden" name="session_date" value={s.date}/>
        <input type="hidden" name="start_time" value={s.start}/><input type="hidden" name="week" value={week}/>
        <button className="ghost smallBtn">Mở lại</button>
      </form>}
    </div> : <div className="strictStateLine">
      {can&&s.status.key==="todo"&&<details className="modalLike">
        <summary className="btn primary smallBtn">Xếp học bù</summary>
        <form className="formCard" action="/api/makeup/create" method="post">
          <input type="hidden" name="target_class_id" value={s.classId}/>
          <input type="hidden" name="target_session_date" value={s.date}/>
          <input type="hidden" name="target_start_time" value={s.start}/>
          <input type="hidden" name="target_end_time" value={s.end}/>
          <input type="hidden" name="back" value={`/schedule?week=${week}`}/>
          <label>Lượt vắng chờ xếp<select name="absence" required>
            <option value="">Chọn học sinh</option>
            {sameGradePending.map((p:any)=><option key={p.key} value={`${p.student.id}|${p.class.id}|${p.session.session_date}`}>{p.student.name} - {p.class.name} - {formatVN(p.session.session_date)}</option>)}
          </select></label>
          <label>Ghi chú<input name="note" placeholder="Học bù do vắng buổi trước"/></label>
          <button className="primary">Lưu học bù</button>
          {!sameGradePending.length&&<div className="mini">Chưa có học sinh vắng cùng khối chờ xếp.</div>}
        </form>
      </details>}
      {can&&s.status.key==="todo"&&<details className="modalLike">
        <summary className="btn ghost smallBtn">Cho nghỉ</summary>
        <form className="formCard" action="/api/schedule/cancel" method="post">
          <input type="hidden" name="class_id" value={s.classId}/><input type="hidden" name="session_date" value={s.date}/>
          <input type="hidden" name="start_time" value={s.start}/><input type="hidden" name="end_time" value={s.end}/>
          <input type="hidden" name="week" value={week}/>
          <label>Lý do<input name="reason" defaultValue="Nghỉ buổi học"/></label>
          <button className="danger">Xác nhận nghỉ</button>
        </form>
      </details>}
      {s.status.key==="done"&&<a className="absenceBtn" href={`/makeup`}>Xem lượt vắng</a>}
      {s.status.key==="live"&&<a className="btn primary smallBtn" href={`/attendance?class_id=${s.classId}&date=${s.date}&start=${s.start}`}>Điểm danh</a>}
    </div>}
  </div>
}
