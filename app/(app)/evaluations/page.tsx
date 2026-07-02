import { requireUser } from "@/lib/auth";
import { classesFor } from "@/lib/data";
import { supabaseAdmin } from "@/lib/supabase";
import { EvalImage } from "@/components/ShareImages";

const FIELDS:[string,string][] = [["listening","Listening"],["speaking","Speaking"],["reading","Reading"],["writing","Writing"],["vocabulary","Vocabulary"],["participation","Participation"],["homework","Homework"]];

export default async function Evaluations(){
  const u=await requireUser();
  const cls=await classesFor(u,u.role==="manager"?"mine":"all");
  const {data:evs}=await supabaseAdmin().from("evaluations").select("*").eq("month","2026-06");
  const m=new Map((evs||[]).map((e:any)=>[e.student_id,e]));

  return <>
    <div className="pageRibbon"><div className="pageHeader">
      <div className="headline">
        <h1>Đánh giá học sinh</h1>
        <p className="sub">Mỗi học sinh có một form đánh giá theo tháng. Giao diện đã được tối ưu lại để dễ nhập dữ liệu và tạo ảnh đánh giá ngang.</p>
      </div>
      <span className="chip active">Theo tháng 06 / 2026</span>
    </div></div>

    <div className="grid2">
      {cls.map((c:any)=><section className="sectionCard evalClass" key={c.id}>
        <div className="sectionHead"><div><h2 className="sectionTitle">{c.name}</h2><p className="sectionHint">{c.teachers?.name||"-"} • {c.students?.length||0} học sinh</p></div><span className="pill blue">Nhóm theo lớp</span></div>
        {c.students?.map((s:any)=>{
          const ev:any=m.get(s.id)||{student_id:s.id,class_id:c.id,month:"2026-06",listening:3,speaking:3,reading:3,writing:3,vocabulary:3,participation:3,homework:3,comment:"",strengths:"",improvements:"",suggestion:"",status:"draft"};
          const data={...ev,student_name:s.name,class_name:c.name};
          return <details className="evalStudent" key={s.id}>
            <summary>
              <div><span>{s.name}</span><div className="scorePreview"><span style={{width:`${Math.round(((Number(ev.listening)+Number(ev.speaking)+Number(ev.reading)+Number(ev.writing)+Number(ev.vocabulary)+Number(ev.participation)+Number(ev.homework))/35)*100)}%`}}></span></div></div>
              <span className={`pill ${ev.status==="published"?"greenP":"orange"}`}>{ev.status==="published"?"Đã gửi":"Bản nháp"}</span>
            </summary>
            <form action="/api/evaluations/save" method="post" style={{marginTop:14,display:"grid",gap:14}}>
              <input type="hidden" name="student_id" value={s.id}/>
              <input type="hidden" name="class_id" value={c.id}/>
              <div className="evalFormGrid">
                {FIELDS.map(([key,label])=><div key={key} className="evalMetric"><div className="label">{label}</div><input type="number" min="1" max="5" name={key} defaultValue={ev[key]}/></div>)}
              </div>
              <div className="evalTextAreas">
                <label>Tổng quan<textarea name="comment" defaultValue={ev.comment}/></label>
                <label>Điểm mạnh<textarea name="strengths" defaultValue={ev.strengths}/></label>
                <label>Cần cải thiện<textarea name="improvements" defaultValue={ev.improvements}/></label>
                <label>Gợi ý phụ huynh<textarea name="suggestion" defaultValue={ev.suggestion}/></label>
              </div>
              <div className="actions"><button name="status" value="draft">Lưu nháp</button><button className="primary" name="status" value="published">Gửi PH</button><EvalImage data={data}/></div>
            </form>
          </details>
        })}
        {!c.students?.length&&<div className="empty">Chưa có học sinh trong lớp này.</div>}
      </section>)}
    </div>
  </>
}
