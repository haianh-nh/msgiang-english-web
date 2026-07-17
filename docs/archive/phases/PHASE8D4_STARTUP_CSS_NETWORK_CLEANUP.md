# Phase 8D.4 — Startup, CSS & Network Cleanup

Build: `20phase8d4-startup-css-network-cleanup`

## Thay đổi

- Loại dữ liệu demo lớn khỏi JavaScript production; dữ liệu thật vẫn tải từ API sau đăng nhập.
- `app.js` giảm từ khoảng 504 KB xuống 234 KB.
- `app.css` bắt buộc giảm từ khoảng 106 KB xuống 59 KB.
- CSS Dashboard, Lớp, Lịch/Điểm danh/Học bù, Nhân sự, Thư viện, Học phí, Đánh giá, Cài đặt và Chuyển lớp được tải cùng module tương ứng.
- Network request dedupe/cache được gom vào `public/v15/network-runtime.js`.
- Xóa placeholder/comment cũ từ các lần tách module trước.
- Reset dữ liệu cục bộ sẽ tải lại dữ liệu thật từ server thay vì quay về dữ liệu demo.

## Không thay đổi

- Không có migration SQL.
- Không thay đổi API, quyền role hoặc nghiệp vụ.
- Lễ tân vẫn không có Học phí.
- Điểm danh vẫn thực hiện trong Lịch dạy.
- Chuyển lớp vẫn giữ dữ liệu lịch sử.
