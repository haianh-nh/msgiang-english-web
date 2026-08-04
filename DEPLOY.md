# Deploy Phase 8D.4.12

- Không có migration SQL mới.
- Thêm tab **Tất cả** và đặt làm mặc định mỗi lần mở Thư viện.
- Chuyển Word/PDF/Audio chỉ lọc metadata đã tải, không gọi lại API.
- Tab và bộ lọc dùng partial render, không dựng lại toàn bộ app.
- Cache metadata Thư viện trên thiết bị trong 24 giờ để quay lại tab hiển thị ngay, sau đó tự làm mới nền.
- Smart warm-up ưu tiên tải module và metadata Thư viện.
- Audio không preload khi chỉ đang xem danh sách.
- Chạy `npm ci && npm run verify` trước khi push.

Build: `20phase8d4-12-library-all-fast-loading`
