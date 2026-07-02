import { requireUser, canManage } from "@/lib/auth";
import { classesFor } from "@/lib/data";
import { pendingAbsences, makeupRows, formatVN, dayName } from "@/lib/schedule";

export default async function Makeup(){
  const user=await requireUser();
  const cls=await classesFor(user,user.role==="manager"?"mine":"all");
  const pending=await pendingAbsences();
  const plans=await makeupRows();
  const visibleClassIds=new Set(cls.map((c:any)=>c.id));
  const visiblePlans=plans.filter((p:any)=>visibleClassIds.has(p.target_class_id)||visibleClassIds.has(p.source_class_id));
  const visiblePending=pending.filter((p:any)=>visibleClassIds.has(p.class?.id) || cls.some((c:any)=>c.grade===p.class?.grade));

  return <>
    <div className="pageRibbon">
      <div className="screenTitle">
        <div>
          <h1>Học bù</h1>
          <p>Mỗi lượt vắng từ điểm danh có thể được xếp vào một buổi học cùng khối. Hủy học bù sẽ đưa lượt vắng quay lại danh sách chờ xếp.</p>
        </div>
        {canManage(user)&&<a className="btn primary" href="/schedule">Sang lịch dạy để xếp</a>}
      </div>
    </div>

    <div className="statGrid">
      <div className="stat"><div className="statIcon redgrad">🚫</div><div><h3>Lượt vắng chờ xếp</h3><strong>{visiblePending.length}</strong><small>Từ dữ liệu điểm danh</small></div></div>
      <div className="stat"><div className="statIcon bluegrad">🔁</div><div><h3>Đã xếp học bù</h3><strong>{visiblePlans.length}</strong><small>Đang còn hiệu lực</small></div></div>
      <div className="stat"><div className="statIcon greengrad">🏫</div><div><h3>Lớp có thể nhận</h3><strong>{cls.filter((c:any)=>c.status==="active").length}</strong><small>Theo quyền tài khoản</small></div></div>
      <div className="stat"><div className="statIcon yellowgrad">15</div><div><h3>Giới hạn sĩ số</h3><strong>15</strong><small>Chính thức + học bù</small></div></div>
    </div>

    <div className="twoCol">
      <section className="makeupTableCard">
        <div className="sectionHead"><div><h2 className="sectionTitle">Lượt vắng chờ xếp</h2><p className="sectionHint">Các học sinh đã được điểm danh là vắng nhưng chưa có lịch học bù.</p></div></div>
        <div className="modalTableWrap"><table className="modalTable"><thead><tr><th>Học sinh</th><th>Lớp vắng</th><th>Ngày vắng</th><th>Gợi ý</th></tr></thead><tbody>
          {visiblePending.length?visiblePending.map((p:any)=><tr key={p.key}>
            <td><b>{p.student.name}</b><div className="mini">{p.student.parent_phone||""}</div></td>
            <td>{p.class?.name}</td>
            <td>{formatVN(p.session.session_date)}</td>
            <td><a className="btn ghost smallBtn" href="/schedule">Xếp trên lịch</a></td>
          </tr>):<tr><td colSpan={4}>Chưa có lượt vắng nào chờ xếp.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="makeupTableCard">
        <div className="sectionHead"><div><h2 className="sectionTitle">Lịch học bù đã xếp</h2><p className="sectionHint">Danh sách active từ bảng makeup_plans.</p></div></div>
        <div className="modalTableWrap"><table className="modalTable"><thead><tr><th>Học sinh</th><th>Lượt vắng</th><th>Lớp nhận</th><th>Buổi học bù</th><th>Thao tác</th></tr></thead><tbody>
          {visiblePlans.length?visiblePlans.map((p:any)=><tr key={p.id}>
            <td><b>{p.students?.name}</b></td>
            <td>{p.source_class?.name}<div className="mini">{formatVN(p.source_session_date)}</div></td>
            <td>{p.target_class?.name}</td>
            <td><span className="sessionTag">{formatVN(p.target_session_date)} • {String(p.target_start_time||"").slice(0,5)}</span></td>
            <td>{canManage(user)&&<form action="/api/makeup/cancel" method="post"><input type="hidden" name="id" value={p.id}/><input type="hidden" name="back" value="/makeup"/><button className="ghost smallBtn">Hủy</button></form>}</td>
          </tr>):<tr><td colSpan={5}>Chưa có lịch học bù đã xếp.</td></tr>}
        </tbody></table></div>
      </section>
    </div>

    <div className="demoNotice">
      Ghi chú: để có dữ liệu học bù, trước tiên vào <b>Điểm danh</b> và lưu học sinh ở trạng thái <b>Vắng</b>. Sau đó vào <b>Thời khóa biểu</b> → chọn buổi chưa dạy → <b>Xếp học bù</b>.
    </div>
  </>
}
