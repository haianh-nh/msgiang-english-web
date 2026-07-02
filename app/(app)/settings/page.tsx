import { requireUser } from "@/lib/auth";
export default async function Settings(){
  const u=await requireUser();
  return <>
    <div className="pageRibbon"><div className="pageHeader">
      <div className="headline">
        <h1>Cài đặt</h1>
        <p className="sub">Thông tin hệ thống hiện tại và ghi chú vận hành.</p>
      </div>
    </div></div>
    <div className="grid2">
      <div className="sectionCard settingsCard">
        <div className="sectionHead"><div><h2 className="sectionTitle">Tài khoản đang đăng nhập</h2><p className="sectionHint">Thông tin cơ bản của phiên làm việc hiện tại.</p></div></div>
        <div className="studentList">
          <div className="studentItem"><span className="strong">Tên</span><span>{u.name}</span></div>
          <div className="studentItem"><span className="strong">Role</span><span className="pill red">{u.role}</span></div>
          <div className="studentItem"><span className="strong">Số điện thoại</span><span>{u.phone}</span></div>
        </div>
      </div>
      <div className="sectionCard settingsCard">
        <div className="sectionHead"><div><h2 className="sectionTitle">Ghi chú hệ thống</h2><p className="sectionHint">Những điểm đang áp dụng cho bản web thật.</p></div></div>
        <div className="noteBlock">• Cổng phụ huynh đã bỏ khỏi bản web thật hiện tại.<br/>• Thông tin học phí và đánh giá học sinh được gửi qua ảnh từ thẻ Học phí / Đánh giá.<br/>• UI/UX đã được nâng theo phong cách demo V48 để dễ dùng hơn.</div>
      </div>
    </div>
  </>
}
