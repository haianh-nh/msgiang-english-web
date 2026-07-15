# Phase 8.0 — Student Transfer & Schedule-only Attendance

- Thêm chuyển lớp từng học sinh bằng RPC transaction; giữ nguyên `student_id`.
- Lưu lịch sử lớp trong `official_student_enrollments` và tự tạo enrollment cho học sinh mới.
- Chống gửi trùng bằng `request_id`; popup giữ dữ liệu khi lỗi và khóa thao tác khi đang gửi.
- Cập nhật cục bộ lớp cũ/lớp mới, sĩ số và cache; không render lại toàn trang.
- Bỏ tab/trang Điểm danh độc lập. Popup điểm danh vẫn mở từ Lịch dạy.
- Route Điểm danh cũ tự chuyển sang Lịch dạy.
- Thêm lịch sử enrollment vào backup và health check.

Migration bắt buộc:
`supabase/migrations/20260716_phase8_student_transfer_enrollments.sql`
