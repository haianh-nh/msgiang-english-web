import { requireUser } from "@/lib/auth";
import { classesFor } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase";
import { makeupRows, dayName, dateForDay, iso, mondayOf, parseDate, sessionStatus } from "@/lib/schedule";

export default async function Attendance({searchParams}:{searchParams:Promise<any>}){
  const user=await requireUser();
  const sp=await searchParams;
  const scope=user.role==="manager"?(sp.scope||"mine"):"mine";
  const cls=await classesFor(user,scope);
  const today=new Date().toISOString().slice(0,10);
  const date=String(sp.date||today);
  const classId=String(sp.class_id||cls[0]?.id||"");
  const c=cls.find((x:any)=>x.id===classId);
  const scheds=(c?.class_schedules||[]);
  const start=String(sp.start||scheds[0]?.start_time||"17:00").slice(0,5);
  const selectedSched=scheds.find((x:any)=>String(x.start_time).slice(0,5)===start)||scheds[0]||{start_time:start,end_time:"18:30"};
  const end=String(selectedSched.end_time||"18:30").slice(0,5);
  const plans=await makeupRows();
  const makeupForSession=plans.filter((p:any)=>p.target_class_id===classId && p.target_session_date===date && String(p.target_start_time||"").slice(0,5)===start);
  let rows:any[]=[];
  if(c){
    const {data:sess}=await supabaseAdmin().from("attendance_sessions").select("*,attendance_rows(*)").eq("class_id",c.id).eq("session_date",date).eq("start_time",start).maybeSingle();
    rows=sess?.attendance_rows||[];
  }
  const regular=(c?.students||[]).map((s:any)=>({...s, rosterType:"official"}));
  const makeup=makeupForSession.map((p:any)=>({...p.students, rosterType:"makeup", makeupPlan:p}));
  const roster=[...regular,...makeup].filter((x:any)=>x?.id);
  const present=rows.filter((r:any)=>r.status==="present").length;
  const late=rows.filter((r:any)=>r.status==="late").length;
  const absent=rows.filter((r:any)=>r.status==="absent").length;
  const st=sessionStatus(date,start,end,false);

  return <>
    <div className="pageRibbon">
      <div className="screenTitle">
        <div>
          <h1>Điểm danh</h1>
          <p>Điểm danh theo buổi học. Danh sách gồm học sinh chính thức và học sinh học bù đã xếp từ Thời khóa biểu.</p>
        </div>
        {user.role==="manager"&&<div className="segmented">
          <a className={`chip ${scope==="mine"?"active":""}`} href="/attendance?scope=mine">Chỉ lớp mình dạy</a>
          <a className={`chip ${scope==="all"?"active":""}`} href="/attendance?scope=all">Tất cả lớp</a>
        </div>}
      </div>
    </div>

    <section className="sectionCard">
      <div className="sectionHead"><div><h2 className="sectionTitle">Mở buổi điểm danh</h2><p className="sectionHint">Nếu lớp có 2 buổi/tuần, chọn đúng khung giờ để lưu riêng từng buổi.</p></div></div>
      <form className="toolbarGrid form compact">
        <input type="hidden" name="scope" value={scope}/>
        <label>Lớp<select name="class_id" defaultValue={classId}>{cls.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label>Ngày<input type="date" name="date" defaultValue={date}/></label>
        <label>Buổi học<select name="start" defaultValue={start}>{scheds.map((x:any)=><option key={x.id} value={String(x.start_time).slice(0,5)}>{dayName(Number(x.day_of_week))} • {String(x.start_time).slice(0,5)}-{String(x.end_time).slice(0,5)}</option>)}</select></label>
        <div style={{display:"flex",alignItems:"end"}}><button className="primary">Mở điểm danh</button></div>
      </form>
    </section>

    {c && <section className="sectionCard">
      <div className="sectionHead">
        <div><h2 className="sectionTitle">{c.name}</h2><p className="sectionHint">{c.teachers?.name||"-"} • {date} • {start}-{end}</p></div>
        <span className={`statusDot2 ${st.key}`}>{st.label}</span>
      </div>

      <div className="attendanceSummary">
        <div className="miniStat"><div className="mini">Có mặt</div><strong>{present}</strong></div>
        <div className="miniStat"><div className="mini">Muộn</div><strong>{late}</strong></div>
        <div className="miniStat"><div className="mini">Vắng</div><strong>{absent}</strong></div>
      </div>

      <div className="cardToolbar" style={{marginBottom:14}}>
        <div><b>{regular.length}</b> chính thức • <b>{makeup.length}</b> học bù • Tổng <b>{roster.length}/15</b></div>
        <span className={`capacityBadge ${roster.length>=15?"full":""}`}>Sức chứa {roster.length}/15</span>
      </div>

      <form action="/api/attendance/save" method="post">
        <input type="hidden" name="class_id" value={c.id}/>
        <input type="hidden" name="date" value={date}/>
        <input type="hidden" name="start_time" value={start}/>
        <input type="hidden" name="end_time" value={end}/>
        <input type="hidden" name="student_ids" value={roster.map((x:any)=>x.id).join(",")}/>
        <div className="visualTable">
          {roster.map((s:any)=>{
            const r=rows.find((x:any)=>x.student_id===s.id);
            const status = r?.status || "present";
            return <div className="visualRow" key={`${s.rosterType}_${s.id}`}>
              <div><span className={`statusDot ${status==="late"?"late":status==="absent"?"absent":""}`}></span><b>{s.name}</b><div className="mini">{s.rosterType==="makeup"?"Học bù":"Chính thức"} • PH: {s.parent_phone || "-"}</div></div>
              <select className="statusSelect" name={`status_${s.id}`} defaultValue={status}><option value="present">Có mặt</option><option value="late">Muộn</option><option value="absent">Vắng</option></select>
              <input name={`note_${s.id}`} defaultValue={r?.note||""} placeholder={s.rosterType==="makeup"?"Ghi chú học bù":"Ghi chú thêm nếu cần"}/>
            </div>
          })}
        </div>
        <div className="actions" style={{marginTop:14}}><button className="primary">Lưu / Sửa điểm danh</button></div>
      </form>
    </section>}

    {!c && <div className="empty">Chưa có lớp để điểm danh theo bộ lọc hiện tại.</div>}
  </>
}
