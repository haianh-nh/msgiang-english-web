# V15 Module Cache

Mục tiêu: sau V13 lazy-load và V14 API/index, V15 thêm cache theo module để chuyển tab và reload nhanh hơn.

## Cách hoạt động

- Cache riêng từng module trong `localStorage`, tách khỏi snapshot demo cũ.
- Cache theo user đang đăng nhập.
- TTL mặc định: 10 phút.
- Cache key:
  - `schedule:YYYY-MM-DD` theo tuần
  - `attendance:YYYY-MM-DD` theo tuần
  - `tuition:YYYY-MM` theo tháng
  - `evaluation:YYYY-MM` theo tháng
  - `library:latest`
  - `teachers:latest`
- Nếu cache còn hạn, tab render ngay.
- Nếu hết hạn hoặc đổi tuần/tháng, API sẽ tải lại.

## Không thay đổi

- Không đổi SQL.
- Không đổi UI/UX chính.
- Không đổi học phí, điểm danh, học bù, đánh giá hoặc phân quyền.
- Không sửa phần autofill mật khẩu.

## Test bắt buộc

1. Login Admin.
2. Mở Lịch dạy lần đầu, chờ tải.
3. Chuyển tab khác rồi quay lại Lịch dạy: phải nhanh hơn.
4. Mở Học phí tháng hiện tại, đổi tab rồi quay lại: phải nhanh.
5. Đổi tháng học phí: phải tải lại đúng tháng mới.
6. Mở Đánh giá, đổi tháng đánh giá: phải tải đúng tháng.
7. Logout/login giáo viên: không được thấy cache dữ liệu Admin.
