# Phase 7L.1 — Smart Warm-up & Fast Heavy Tabs

- Tải nền module và dữ liệu Giáo viên, Thư viện, Đánh giá sau đăng nhập.
- Admin/Manager tải nền Học phí sau cùng; Lễ tân tuyệt đối không tải Học phí.
- Rê chuột/focus/chạm menu sẽ warm-up route trước khi mở.
- Dùng chung request đang chạy, tránh tab kẹt ở skeleton khi người dùng mở đúng lúc preload.
- Gộp Giáo viên + tài khoản Admin vào `/api/staff/overview` để giảm một vòng request.
- Hoãn serialize local cache tới lúc trình duyệt rảnh.
- Tự bỏ preload nền khi Save-Data/2G, tab ẩn hoặc popup đang mở.
