# Phase 8D.4.11 — Library PDF Tab Fix

## Lỗi

Thư viện đếm đúng file PDF nhưng khi bấm tab PDF, code cũ tự chuyển `libraryTab` về Word và đổi `type=pdf` thành `type=word`.

## Sửa

- Loại bỏ toàn bộ ánh xạ `pdf -> word`.
- `setLibraryTab()` chấp nhận riêng Word, PDF và Audio.
- Giữ tab PDF sau reload.
- PDF legacy lưu nhầm type vẫn được phân loại theo phần mở rộng/MIME.
- Thêm smoke test ngăn lỗi quay lại.

Không thay đổi database hoặc Storage.
