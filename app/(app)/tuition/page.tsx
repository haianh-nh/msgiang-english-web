import { requireUser, canTuition } from "@/lib/auth";
import { classesFor, money } from "@/lib/data";
import { tuitionRows, normalizeMonth, DEFAULT_SESSION_RATE, vnMonth } from "@/lib/tuition";
import { TuitionImage } from "@/components/ShareImages";

function keep(v:any){return String(v||"")}

export default async function Tuition({searchParams}:{searchParams:Promise<any>}){
  const u=await requireUser();
  if(!canTuition(u)) return <div className="empty">Giáo viên không có quyền xem học phí.</div>;
  const sp=await searchParams;
  const month=normalizeMonth(sp.month);
  const classFilter=keep(sp.class_id||"all");
  const status=keep(sp.status||"all");
  const q=keep(sp.q).toLowerCase();
  const rate=Number(sp.rate||DEFAULT_SESSION_RATE);
  const cls=await classesFor(u,"all");
  let rows=await tuitionRows(cls,month,rate);
  if(classFilter!=="all") rows=rows.filter((r:any)=>r.class_id===classFilter);
  if(q) rows=rows.filter((r:any)=>[r.student_name,r.class_name,r.parent_phone].join(" ").toLowerCase().includes(q));
  if(status==="paid") rows=rows.filter((r:any)=>r.paid);
  if(status==="unpaid") rows=rows.filter((r:any)=>!r.paid);
  if(status==="sent") rows=rows.filter((r:any)=>r.sent);
  if(status==="unsent") rows=rows.filter((r:any)=>!r.sent);
  const totalAmount=rows.reduce((s:number,r:any)=>s+r.amount,0);
  const paidAmount=rows.filter((r:any)=>r.paid).reduce((s:number,r:any)=>s+r.amount,0);
  const unpaidAmount=totalAmount-paidAmount;
  const sentCount=rows.filter((r:any)=>r.sent).length;
  const back=`/tuition?month=${month}&class_id=${classFilter}&status=${status}&q=${encodeURIComponent(q)}&rate=${rate}`;

  return <>
    <div className="pageRibbon"><div className="screenTitle">
      <div>
        <h1>Học phí</h1>
        <p>Tính học phí thật theo điểm danh: có mặt, muộn và học bù có đi học mới tính tiền; vắng/nghỉ không tính.</p>
      </div>
      <span className="chip active">{vnMonth(month)} • {money(rate)}/buổi</span>
    </div></div>

    <div className="grid4">
      <div className="metricCard"><div className="metricAccent">🧾</div><div className="metricLabel">Học sinh hiển thị</div><div className="metricValue">{rows.length}</div><p className="metricHint">Sau lọc lớp/trạng thái/tìm kiếm</p></div>
      <div className="metricCard"><div className="metricAccent">💵</div><div className="metricLabel">Tổng học phí</div><div className="metricValue" style={{fontSize:32}}>{money(totalAmount)}</div><p className="metricHint">Tổng tiền theo buổi tính phí</p></div>
      <div className="metricCard"><div className="metricAccent">✅</div><div className="metricLabel">Đã nộp</div><div className="metricValue" style={{fontSize:32}}>{money(paidAmount)}</div><p className="metricHint">Còn thiếu: {money(unpaidAmount)}</p></div>
      <div className="metricCard"><div className="metricAccent">📨</div><div className="metricLabel">Đã gửi thông tin</div><div className="metricValue">{sentCount}</div><p className="metricHint">Trạng thái gửi phụ huynh</p></div>
    </div>

    <section className="sectionCard">
      <div className="sectionHead"><div><h2 className="sectionTitle">Bộ lọc học phí</h2><p className="sectionHint">Giống demo: lọc theo tháng, lớp, đã nộp/chưa nộp, đã gửi/chưa gửi.</p></div></div>
      <form className="form compact">
        <label>Tháng<input type="month" name="month" defaultValue={month}/></label>
        <label>Đơn giá / buổi<input type="number" name="rate" defaultValue={rate}/></label>
        <label>Lớp<select name="class_id" defaultValue={classFilter}><option value="all">Tất cả lớp</option>{cls.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Trạng thái<select name="status" defaultValue={status}><option value="all">Tất cả</option><option value="unpaid">Chưa nộp</option><option value="paid">Đã nộp</option><option value="unsent">Chưa gửi</option><option value="sent">Đã gửi</option></select></label>
        <label className="full">Tìm học sinh / lớp / SĐT<input name="q" defaultValue={q} placeholder="Nhập tên học sinh, lớp hoặc SĐT phụ huynh"/></label>
        <div className="actions full"><button className="primary">Lọc học phí</button><a className="btn ghost" href={`/tuition?month=${month}`}>Xóa lọc</a></div>
      </form>
    </section>

    <div className="tuitionGridV5">
      {rows.map((r:any)=><div className="tuitionCardV5" key={r.student_id}>
        <div className="tuitionTopV5">
          <div>
            <h2>{r.student_name}</h2>
            <div className="mini">{r.class_name} • GV: {r.teacher_name} • PH: {r.parent_phone||"-"}</div>
          </div>
          <div className="chipRow"><span className={`pill ${r.paid?"greenP":"orange"}`}>{r.paid?"Đã nộp":"Chưa nộp"}</span><span className={`pill ${r.sent?"blue":"gray"}`}>{r.sent?"Đã gửi":"Chưa gửi"}</span></div>
        </div>
        <div className="paymentStats">
          <span><b>{r.official_present}</b>Có mặt</span><span><b>{r.late}</b>Muộn</span><span><b>{r.makeup_present}</b>Học bù</span><span><b>{r.absent}</b>Vắng</span>
        </div>
        <div className="tuitionAmountLine"><div><div className="mini">Buổi tính phí</div><strong>{r.billable}</strong></div><div><div className="mini">Học phí</div><strong>{r.amount_text}</strong></div></div>
        <details className="modalLike"><summary className="summaryLink"><span>Chi tiết / tin nhắn phụ huynh</span><span className="pill blue">Nội dung gửi</span></summary><div className="noteBlock">{r.message}</div></details>
        <div className="actions">
          <TuitionImage row={{...r,present:r.official_present,makeup:r.makeup_present,amount_text:r.amount_text}}/>
          <form action="/api/tuition/update-status" method="post"><input type="hidden" name="student_id" value={r.student_id}/><input type="hidden" name="month" value={month}/><input type="hidden" name="amount" value={r.amount}/><input type="hidden" name="billable" value={r.billable}/><input type="hidden" name="back" value={back}/><button className="primary" name="action" value={r.paid?"unpaid":"paid"}>{r.paid?"Bỏ đã nộp":"Đã nộp"}</button></form>
          <form action="/api/tuition/update-status" method="post"><input type="hidden" name="student_id" value={r.student_id}/><input type="hidden" name="month" value={month}/><input type="hidden" name="amount" value={r.amount}/><input type="hidden" name="billable" value={r.billable}/><input type="hidden" name="back" value={back}/><button className="ghost" name="action" value={r.sent?"unsent":"sent"}>{r.sent?"Bỏ đã gửi":"Đã gửi thông tin"}</button></form>
        </div>
      </div>)}
    </div>

    <section className="sectionCard">
      <div className="sectionHead"><div><h2 className="sectionTitle">Bảng tổng hợp nhanh</h2><p className="sectionHint">Dạng bảng để quản lí rà soát nhanh toàn bộ học sinh.</p></div></div>
      <div className="table"><table><thead><tr><th>Học sinh</th><th>Lớp</th><th>Đi học</th><th>Học bù</th><th>Vắng</th><th>Buổi tính</th><th>Học phí</th><th>Trạng thái</th></tr></thead><tbody>{rows.map((r:any)=><tr key={`table_${r.student_id}`}><td><b>{r.student_name}</b><div className="mini">{r.parent_phone||"-"}</div></td><td>{r.class_name}</td><td>{r.official_present+r.late}</td><td>{r.makeup_present}</td><td>{r.absent}</td><td>{r.billable}</td><td className="money">{r.amount_text}</td><td><span className={`pill ${r.paid?"greenP":"orange"}`}>{r.paid?"Đã nộp":"Chưa nộp"}</span></td></tr>)}</tbody></table></div>
    </section>
    {!rows.length&&<div className="empty">Không có học sinh phù hợp bộ lọc học phí.</div>}
  </>
}
