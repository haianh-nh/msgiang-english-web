import { supabaseAdmin } from "./supabase";
import { money } from "./data";

export const DEFAULT_SESSION_RATE = 150000;

export function currentMonth(){ return new Date().toISOString().slice(0,7); }
export function normalizeMonth(m:any){ const s=String(m||""); return /^\d{4}-\d{2}$/.test(s) ? s : currentMonth(); }
export function monthBounds(month:string){
  const start = `${month}-01`;
  const d = new Date(`${start}T00:00:00`);
  d.setMonth(d.getMonth()+1);
  const end = d.toISOString().slice(0,10);
  return {start,end};
}
export function vnMonth(month:string){
  const [y,m]=month.split("-");
  return `Tháng ${m}/${y}`;
}

export async function tuitionRows(classes:any[], month:string, rate=DEFAULT_SESSION_RATE){
  const s=supabaseAdmin();
  const {start,end}=monthBounds(month);
  const classIds=classes.map((c:any)=>c.id).filter(Boolean);
  const studentRows=classes.flatMap((c:any)=>(c.students||[]).map((stu:any)=>({student:stu,class:c})));
  const studentIds=studentRows.map((x:any)=>x.student.id).filter(Boolean);

  const {data:sessions}=classIds.length
    ? await s.from("attendance_sessions").select("*, attendance_rows(*)").in("class_id",classIds).gte("session_date",start).lt("session_date",end)
    : {data:[] as any[]};

  const {data:plans}=classIds.length
    ? await s.from("makeup_plans").select("*").in("target_class_id",classIds).gte("target_session_date",start).lt("target_session_date",end).neq("status","cancelled")
    : {data:[] as any[]};

  const {data:statuses}=studentIds.length
    ? await s.from("tuition_status").select("*").in("student_id",studentIds).eq("month",month)
    : {data:[] as any[]};

  const statusMap=new Map((statuses||[]).map((x:any)=>[x.student_id,x]));
  const makeupTarget=new Map((plans||[]).map((p:any)=>[
    `${p.target_class_id}|${p.target_session_date}|${String(p.target_start_time||"").slice(0,5)}|${p.student_id}`,
    p
  ]));

  const base=new Map(studentRows.map((x:any)=>[x.student.id,{
    student_id:x.student.id,
    student_name:x.student.name,
    parent_phone:x.student.parent_phone||"",
    class_id:x.class.id,
    class_name:x.class.name,
    teacher_name:x.class.teachers?.name||"-",
    official_present:0,
    late:0,
    makeup_present:0,
    absent:0,
    total_records:0,
    billable:0,
    rate,
    amount:0,
    paid:false,
    paid_at:null,
    sent:false,
    sent_at:null,
    note:"",
    amount_text:"0đ",
    month,
    month_label:vnMonth(month),
    message:""
  }]));

  for(const sess of sessions||[]){
    const st=String(sess.start_time||"").slice(0,5);
    for(const r of sess.attendance_rows||[]){
      let row:any=base.get(r.student_id);
      if(!row) continue;
      const isMakeup = makeupTarget.has(`${sess.class_id}|${sess.session_date}|${st}|${r.student_id}`);
      row.total_records += 1;
      if(r.status==="absent") { row.absent += 1; continue; }
      if(r.status==="late") row.late += 1;
      else if(isMakeup) row.makeup_present += 1;
      else row.official_present += 1;
      row.billable += 1;
    }
  }

  return Array.from(base.values()).map((row:any)=>{
    const st:any=statusMap.get(row.student_id)||{};
    row.amount = row.billable * rate;
    row.amount_text = money(row.amount);
    row.paid = !!st.paid;
    row.paid_at = st.paid_at || null;
    row.sent = !!st.sent_at;
    row.sent_at = st.sent_at || null;
    row.note = st.note || "";
    row.message = `Kính gửi phụ huynh bé ${row.student_name}, học phí ${row.month_label} là ${row.amount_text}. Số buổi tính phí: ${row.billable}. Chi tiết: có mặt ${row.official_present}, muộn ${row.late}, học bù ${row.makeup_present}, vắng ${row.absent}. Trân trọng, Ms.Giang English.`;
    return row;
  });
}
