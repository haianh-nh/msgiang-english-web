# Backend V9: Production review, health check, backup

Bản V9 rà soát và bổ sung các phần vận hành production.

## Thêm mới

1. Health Check API:
   - `GET /api/health`
   - Admin only
   - Kiểm tra env, Supabase, bảng bắt buộc và Storage bucket.

2. Backup Export API:
   - `GET /api/backup/export`
   - Admin only
   - Xuất JSON các bảng dữ liệu chính.

3. Maintenance:
   - `POST /api/maintenance/clear-expired-sessions`
   - Admin only
   - Xóa session hết hạn.

4. UI Cài đặt:
   - Thêm khối Production & Backup.
   - Nút kiểm tra hệ thống.
   - Nút tải backup JSON.
   - Nút dọn session hết hạn.

5. Frontend hardening:
   - Chống lỗi render trắng trang.
   - Route bị lỗi sẽ hiện thông báo và nút quay về Tổng quan.
   - Tự normalize dữ liệu cũ: tab PDF → Word, evaluation month.
   - `officialFetch` xử lý an toàn hơn khi dùng FormData.
