# Phase 8D.3 — Dashboard, Tuition & Evaluation Module Split

- Tách Dashboard khỏi `app.js` và chỉ tải sau khi đăng nhập.
- Tách runtime Học phí, runtime Đánh giá và helper tạo ảnh báo cáo.
- `app.js` core giảm từ khoảng 553 KB xuống khoảng 504 KB.
- Giữ helper tháng đánh giá trong core để refresh nền không phụ thuộc thứ tự module.
- Không thay đổi API, database hoặc nghiệp vụ.
- Thêm audit và smoke test dependency cho Dashboard/Học phí/Đánh giá.
