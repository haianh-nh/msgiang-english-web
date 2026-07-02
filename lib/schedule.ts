import { supabaseAdmin } from "./supabase";

export const WEEK_DAYS = [
  {key:1,label:"Thứ 2"},
  {key:2,label:"Thứ 3"},
  {key:3,label:"Thứ 4"},
  {key:4,label:"Thứ 5"},
  {key:5,label:"Thứ 6"},
  {key:6,label:"Thứ 7"},
  {key:0,label:"Chủ nhật"},
];

export function iso(d:Date){ return d.toISOString().slice(0,10); }
export function parseDate(s?:string){ const d=s?new Date(s+"T00:00:00"):new Date(); return isNaN(+d)?new Date():d; }
export function mondayOf(d:Date){
  const x=new Date(d); x.setHours(0,0,0,0);
  const day=x.getDay(); const diff=day===0?-6:1-day;
  x.setDate(x.getDate()+diff); return x;
}
export function addDays(d:Date,n:number){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
export function weekLabel(week:string){
  const start=parseDate(week); const end=addDays(start,6);
  return `${formatVN(start)} - ${formatVN(end)}`;
}
export function formatVN(d:Date|string){ const x=typeof d==="string"?parseDate(d):d; return x.toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit"}); }
export function dateForDay(week:string, day:number){
  const start=parseDate(week);
  const offset = day===0 ? 6 : day-1;
  return iso(addDays(start, offset));
}
export function timeSlot(start:string,end:string){ return `${String(start).slice(0,5)}-${String(end).slice(0,5)}`; }
export function dayName(day:number){ return WEEK_DAYS.find(d=>d.key===day)?.label || ""; }

export function sessionStatus(sessionDate:string,start:string,end:string,cancelled=false){
  if(cancelled) return {key:"cancelled",label:"Nghỉ"};
  const now=new Date();
  const st=new Date(`${sessionDate}T${String(start).slice(0,5)}:00`);
  const en=new Date(`${sessionDate}T${String(end).slice(0,5)}:00`);
  if(now > en) return {key:"done",label:"Đã dạy"};
  if(now >= st && now <= en) return {key:"live",label:"Đang dạy"};
  return {key:"todo",label:"Chưa dạy"};
}

export async function cancellationRows(){
  const {data,error}=await supabaseAdmin().from("session_cancellations").select("*");
  if(error) return [];
  return data||[];
}


export async function makeupRows(){
  const s=supabaseAdmin();
  const {data,error}=await s.from("makeup_plans").select("*").neq("status","cancelled").order("created_at",{ascending:false});
  if(error || !data?.length) return [];
  const studentIds=Array.from(new Set(data.map((x:any)=>x.student_id).filter(Boolean)));
  const classIds=Array.from(new Set(data.flatMap((x:any)=>[x.source_class_id,x.target_class_id]).filter(Boolean)));
  const {data:students}=studentIds.length?await s.from("students").select("*").in("id",studentIds):{data:[] as any[]};
  const {data:classes}=classIds.length?await s.from("classes").select("*").in("id",classIds):{data:[] as any[]};
  const sm=new Map((students||[]).map((x:any)=>[x.id,x]));
  const cm=new Map((classes||[]).map((x:any)=>[x.id,x]));
  return data.map((x:any)=>({...x, students:sm.get(x.student_id), source_class:cm.get(x.source_class_id), target_class:cm.get(x.target_class_id)}));
}



export async function pendingAbsences(){
  const s=supabaseAdmin();
  const {data:sessions,error:sessionError}=await s.from("attendance_sessions").select("*").order("session_date",{ascending:false});
  if(sessionError || !sessions?.length) return [];
  const sessionIds=sessions.map((x:any)=>x.id);
  const {data:rows,error:rowError}=await s.from("attendance_rows").select("*").in("attendance_session_id",sessionIds).eq("status","absent");
  if(rowError || !rows?.length) return [];
  const plans=await makeupRows();
  const plannedKey=new Set(plans.map((p:any)=>`${p.student_id}|${p.source_class_id}|${p.source_session_date}`));
  const studentIds=Array.from(new Set(rows.map((x:any)=>x.student_id).filter(Boolean)));
  const classIds=Array.from(new Set(sessions.map((x:any)=>x.class_id).filter(Boolean)));
  const {data:students}=studentIds.length?await s.from("students").select("*").in("id",studentIds):{data:[] as any[]};
  const {data:classes}=classIds.length?await s.from("classes").select("*").in("id",classIds):{data:[] as any[]};
  const sm=new Map((students||[]).map((x:any)=>[x.id,x]));
  const cm=new Map((classes||[]).map((x:any)=>[x.id,x]));
  const sessMap=new Map((sessions||[]).map((x:any)=>[x.id,x]));
  const out:any[]=[];
  for(const r of rows||[]){
    const sess:any=sessMap.get(r.attendance_session_id);
    if(!sess) continue;
    const student=sm.get(r.student_id);
    const klass=cm.get(sess.class_id);
    if(!student || !klass) continue;
    const key=`${r.student_id}|${sess.class_id}|${sess.session_date}`;
    if(!plannedKey.has(key)) out.push({student, class:klass, session:sess, key});
  }
  return out;
}
