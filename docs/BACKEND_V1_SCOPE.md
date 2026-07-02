# Backend V1 scope

Bản này nối phần nền thật cho UI V48 đã duyệt:

- Auth đăng nhập thật qua API.
- Session cookie HttpOnly.
- Role thật: admin / manager / teacher.
- Settings thật:
  - `tuition_per_session` mặc định 70.000đ/buổi.
  - `session_capacity` mặc định 15 học sinh/buổi.
- Database schema chính thức nền.
- API đọc/ghi nền:
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/auth/me`
  - `/api/auth/change-password`
  - `/api/bootstrap`
  - `/api/settings`
  - `/api/users`
  - `/api/v48-state`

## Lưu ý quan trọng

Để giữ UI 1:1 theo V48, bản này vẫn dùng HTML V48 làm giao diện. 
Các thay đổi trong UI được đồng bộ lên bảng `official_v48_state` như bước chuyển tiếp.
Ở các bản backend sau, từng module sẽ được tách từ snapshot sang bảng chuẩn hoá:
lớp học, lịch học, điểm danh, học bù, học phí, thư viện, đánh giá.
