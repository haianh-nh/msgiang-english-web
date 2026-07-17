# Phase 7L — Frontend Bundle & Asset Performance

- Chỉ tải `ui-runtime.js`, `module-loader.js` và `app.js` ở lần mở đầu.
- Các module Lớp học, Lịch dạy, Điểm danh, Học phí, Thư viện và Đánh giá chỉ tải khi cần.
- Sau đăng nhập, chỉ preload nền một số module thường dùng theo role.
- Supabase Realtime tiếp tục chỉ tải sau đăng nhập.
- Logo chính chuyển từ PNG 129 KB sang WebP khoảng 43 KB.
- Favicon giảm từ khoảng 72 KB xuống khoảng 4 KB.
- Giữ cache immutable cho `/v15/*` và version hóa toàn bộ asset.
- Không thay đổi database hoặc nghiệp vụ.
