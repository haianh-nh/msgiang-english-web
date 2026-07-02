import { requireUser, canManage } from "@/lib/auth";
import { teachers, classesFor } from "@/lib/data";

function roleLabel(r:string){return r==="admin"?"Admin":r==="manager"?"Quản lí":"Giáo viên"}
function roleClass(r:string){return r==="admin"?"red":r==="manager"?"blue":"greenP"}

export default async function Teachers({searchParams}:{searchParams:Promise<any>}){
  const u=await requireUser();
  const sp=await searchParams;
  if(!canManage(u)) return <div className="empty">Không có quyền.</div>;
  const ts=await teachers();
  const cls=await classesFor(u,"all");
  const roleFilter=String(sp.role||"all");
  const q=String(sp.q||"").toLowerCase();
  let list=ts;
  if(roleFilter!=="all") list=list.filter((t:any)=>t.role===roleFilter);
  if(q) list=list.filter((t:any)=>[t.name,t.phone,t.email,t.role].join(" ").toLowerCase().includes(q));
  const counts={teacher:ts.filter((t:any)=>t.role==="teacher").length,manager:ts.filter((t:any)=>t.role==="manager").length,admin:ts.filter((t:any)=>t.role==="admin").length};
  const temp=String(sp.temp||"");
  const tempName=String(sp.name||"Giáo viên");

  return <>
    <div className="pageRibbon"><div className="screenTitle">
      <div>
        <h1>Giáo viên</h1>
        <p>Tạo tài khoản, phân quyền, reset mật khẩu tạm, xem/gán lớp phụ trách và lớp trợ giảng.</p>
      </div>
      <span className="chip active">Admin / Quản lí</span>
    </div></div>

    {temp&&<div className="tempPasswordBox"><div><b>🔑 Mật khẩu tạm cho {decodeURIComponent(tempName)}</b><p>Dùng mật khẩu này đăng nhập lần đầu, hệ thống sẽ yêu cầu đổi mật khẩu.</p></div><code>{temp}</code></div>}

    <div className="grid4">
      <div className="metricCard"><div className="metricAccent">👩‍🏫</div><div className="metricLabel">Giáo viên</div><div className="metricValue">{counts.teacher}</div><p className="metricHint">Tài khoản teacher</p></div>
      <div className="metricCard"><div className="metricAccent">🧭</div><div className="metricLabel">Quản lí</div><div className="metricValue">{counts.manager}</div><p className="metricHint">Quản lí kiêm giáo viên</p></div>
      <div className="metricCard"><div className="metricAccent">👑</div><div className="metricLabel">Admin</div><div className="metricValue">{counts.admin}</div><p className="metricHint">Quyền cao nhất</p></div>
      <div className="metricCard"><div className="metricAccent">🏫</div><div className="metricLabel">Lớp hiện có</div><div className="metricValue">{cls.length}</div><p className="metricHint">Có thể gán phụ trách/trợ giảng</p></div>
    </div>

    <section className="sectionCard">
      <div className="sectionHead"><div><h2 className="sectionTitle">Bộ lọc giáo viên</h2><p className="sectionHint">Tìm nhanh theo tên, số điện thoại, email hoặc phân quyền.</p></div></div>
      <form className="form compact">
        <label>Role<select name="role" defaultValue={roleFilter}><option value="all">Tất cả</option><option value="teacher">Giáo viên</option><option value="manager">Quản lí</option>{u.role==="admin"&&<option value="admin">Admin</option>}</select></label>
        <label className="full">Tìm kiếm<input name="q" defaultValue={q} placeholder="Tên, SĐT, email..."/></label>
        <div className="actions full"><button className="primary">Lọc</button><a className="btn ghost" href="/teachers">Xóa lọc</a></div>
      </form>
    </section>

    <details className="panel modalLike">
      <summary className="summaryLink"><span>👩‍🏫 Tạo giáo viên / quản lí mới</span><span className="pill red">Tài khoản nội bộ</span></summary>
      <div className="formCard"><form className="form" action="/api/teachers/create" method="post">
        <label>Tên<input name="name" required placeholder="Ms Kate"/></label>
        <label>SĐT đăng nhập<input name="phone" required placeholder="09xxxxxxxx"/></label>
        <label>Email<input name="email" type="email" placeholder="nếu có"/></label>
        <label>Role<select name="role"><option value="teacher">Giáo viên</option><option value="manager">Quản lí</option>{u.role==="admin"&&<option value="admin">Admin</option>}</select></label>
        <label className="full">Ghi chú<textarea name="note" placeholder="Ghi chú phân công, ca dạy, liên hệ..."/></label>
        <div className="full"><button className="primary">Tạo tài khoản & cấp mật khẩu tạm</button></div>
      </form></div>
    </details>

    <div className="teacherGridV5">
      {list.map((t:any)=>{
        const mainClasses=cls.filter((c:any)=>c.teacher_id===t.id);
        const assistClasses=cls.filter((c:any)=>c.assistant_teacher_id===t.id || c.assistant_name===t.name);
        return <div className="teacherCardV5" key={t.id}>
          <div className="teacherCardTop">
            <div className="teacherNameBlock"><div className="teacherAvatar">{String(t.name||"T").slice(0,1).toUpperCase()}</div><div><h2 style={{margin:0,fontSize:24}}>{t.name}</h2><p className="sectionHint">{t.phone} {t.email?`• ${t.email}`:""}</p></div></div>
            <div className="chipRow"><span className={`pill ${roleClass(t.role)}`}>{roleLabel(t.role)}</span><span className={`pill ${t.status==="active"?"greenP":"gray"}`}>{t.status||"active"}</span></div>
          </div>
          <div className="teacherClassBlocks">
            <div><b>Phụ trách chính</b><p>{mainClasses.map((c:any)=>c.name).join(", ")||"Chưa gán lớp"}</p></div>
            <div><b>Trợ giảng</b><p>{assistClasses.map((c:any)=>c.name).join(", ")||"Chưa gán trợ giảng"}</p></div>
          </div>
          <div className="noteBlock">{t.note||"Chưa có ghi chú cho giáo viên này."}</div>

          <details className="modalLike"><summary className="summaryLink"><span>Chỉnh sửa thông tin</span><span className="pill blue">Popup</span></summary>
            <form className="formCard" action="/api/teachers/update" method="post">
              <input type="hidden" name="teacher_id" value={t.id}/>
              <label>Tên<input name="name" defaultValue={t.name} required/></label>
              <label>SĐT<input name="phone" defaultValue={t.phone} required/></label>
              <label>Email<input name="email" defaultValue={t.email||""}/></label>
              <label>Role<select name="role" defaultValue={t.role}><option value="teacher">Giáo viên</option><option value="manager">Quản lí</option>{u.role==="admin"&&<option value="admin">Admin</option>}</select></label>
              <label>Trạng thái<select name="status" defaultValue={t.status||"active"}><option value="active">Đang hoạt động</option><option value="inactive">Tạm khóa</option></select></label>
              <label className="full">Ghi chú<textarea name="note" defaultValue={t.note||""}/></label>
              <div className="full"><button className="primary">Lưu giáo viên</button></div>
            </form>
          </details>

          <details className="modalLike"><summary className="summaryLink"><span>Gán lớp</span><span className="pill orange">Main / TA</span></summary>
            <form className="formCard" action="/api/classes/assign-teacher" method="post">
              <input type="hidden" name="teacher_id" value={t.id}/><input type="hidden" name="back" value="/teachers"/>
              <label>Lớp<select name="class_id">{cls.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label>Vai trò trong lớp<select name="assign_type"><option value="main">Giáo viên chính</option><option value="assistant">Trợ giảng</option></select></label>
              <button className="primary">Gán lớp</button>
            </form>
          </details>

          <div className="actions">
            {t.user_id?<form action="/api/users/reset-password" method="post"><input type="hidden" name="user_id" value={t.user_id}/><input type="hidden" name="teacher_name" value={t.name}/><button className="ghost">Reset mật khẩu</button></form>:<span className="pill gray">Chưa có app user</span>}
          </div>
        </div>
      })}
    </div>
    {!list.length&&<div className="empty">Không tìm thấy giáo viên phù hợp.</div>}
  </>
}
