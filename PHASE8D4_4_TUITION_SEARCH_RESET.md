# Phase 8D.4.4 — Tuition Search Reset

## Lỗi đã sửa

Từ khóa tìm kiếm Học phí của một tài khoản có thể được lưu trong local snapshot hoặc official UI snapshot. Khi tải lại trang, ô tìm kiếm tự điền lại mã lớp cũ, làm danh sách chỉ hiển thị một phần học sinh.

## Cách xử lý

- Ô tìm kiếm Học phí chỉ tồn tại trong phiên trang hiện tại.
- Local snapshot luôn lưu `q` rỗng.
- Official snapshot luôn lưu `q` rỗng.
- Snapshot cũ được làm sạch khi bootstrap.
- Tháng/năm và trạng thái lọc vẫn giữ nguyên.
- Tìm kiếm vẫn hoạt động bình thường cho tới khi tải lại trang.

Không thay đổi database, API học phí hoặc công thức tính tiền.
