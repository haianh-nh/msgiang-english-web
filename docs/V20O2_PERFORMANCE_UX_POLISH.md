# V20O.2 — Tuition Performance & UX Polish

## Mục tiêu

- Mở tab Học phí và đổi tháng mượt hơn nhờ hydrate cache theo tháng.
- Giảm render nặng sau các thao tác học phí.
- Chống double-click ở các nút lưu/gửi/đã nộp/cho nghỉ lớp/mở lại buổi học.
- Cải thiện bảng học phí: sticky header, sticky cột Học sinh, thu gọn/mở rộng từng lớp.
- Làm rõ tab Học bù: nghỉ cá nhân không tạo khấu trừ học phí.

## Thay đổi chính

- Thêm busy-state cho nút học phí.
- Sửa học liệu cập nhật local row trước, refresh nền sau.
- Gửi/Đã nộp render nhẹ hơn.
- Gửi hàng loạt có confirm và báo số lượng thành công/lỗi.
- Bảng học phí có nút Mở tất cả/Thu gọn tất cả.
- Thêm migration index hiệu năng an toàn.

## SQL

Chạy thêm:

`supabase/migrations/20260704_v20o2_tuition_performance_indexes.sql`

Nếu chưa chạy V20O thì vẫn phải chạy migration V20O trước.
