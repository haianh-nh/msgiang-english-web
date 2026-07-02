# Backend V6 UI + account fix

Bản này sửa theo feedback sau khi test V6:

1. Chỉnh lại giao diện đổi mật khẩu tạm:
   - layout 2 ô mật khẩu rõ ràng
   - card rộng hơn, không bị dính input
   - icon và mô tả dễ hiểu hơn

2. Bỏ trạng thái "Cần đổi mật khẩu" khỏi card danh sách giáo viên.

3. Thêm chức năng xóa giáo viên:
   - xóa teacher
   - xóa tài khoản đăng nhập liên kết
   - gỡ giáo viên khỏi lớp đang gán
   - chặn xóa chính tài khoản đang đăng nhập

4. Phần Cài đặt & tài khoản được link với danh sách giáo viên/nhân viên:
   - lấy từ `db.teachers`
   - mở chi tiết giáo viên trực tiếp từ bảng tài khoản
   - reset/xóa cùng logic với trang Giáo viên

Không cần chạy SQL mới nếu đã chạy `006_teacher_permissions.sql`.
