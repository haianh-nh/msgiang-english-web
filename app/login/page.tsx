import LoginForm from "./LoginForm";
export default function Login(){
  return <div className="login">
    <div className="hero">
      <img className="heroLogo" src="/logo.png" alt="Ms.Giang English"/>
      <span className="heroBadge">✨ Web thật bám lại demo V48</span>
      <h1>Ms.Giang English Center</h1>
      <p>Quản lí lớp học, thời khóa biểu, điểm danh, học bù, học phí, đánh giá và thư viện tài liệu. Giao diện này được xử lí lại dựa trên bản demo V48 bạn vừa gửi.</p>
      <div className="heroGrid">
        <div className="heroCard"><h3>🗓️ Thời khóa biểu</h3><p>Xem tuần, trạng thái đã dạy / đang dạy / chưa dạy / nghỉ, xếp học bù ngay trên lịch.</p></div>
        <div className="heroCard"><h3>🔁 Học bù</h3><p>Lấy học sinh vắng từ điểm danh, xếp vào lớp cùng khối và theo dõi trạng thái.</p></div>
        <div className="heroCard"><h3>💰 Học phí</h3><p>Tạo ảnh học phí dạng ngang để gửi phụ huynh.</p></div>
        <div className="heroCard"><h3>📊 Đánh giá</h3><p>Tạo ảnh đánh giá có biểu đồ cột và nhận xét chi tiết.</p></div>
      </div>
    </div>
    <div className="loginAside"><LoginForm/></div>
  </div>
}
