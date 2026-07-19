# Phase 8D.4.1 — Tuition Style Hotfix

Build: `20phase8d4-3-tuition-message-cleanup`

## Nguyên nhân

Trang Học phí dùng component `.statGrid/.stat/.statIcon`, nhưng CSS layout của component này nằm trong `dashboard.css`. Vì `dashboard.css` được lazy-load, Học phí chỉ hiển thị đúng sau khi tab Tổng quan đã từng được tải; mở thẳng Học phí có thể làm bốn thẻ tổng quan biến thành các dải ngang.

## Sửa lỗi

- Đưa CSS component thẻ thống kê dùng chung về `public/v15/app.css`.
- Giữ `dashboard.css` chỉ chứa giao diện riêng của Tổng quan.
- Bỏ shortcut `existing.sheet` trong lazy CSS loader.
- Link CSS lỗi/stale bị xóa và lần mở sau được thử lại.
- Route chỉ được coi là ready khi cả module JS và CSS đã load thành công.
- Đồng bộ version marker trên toàn bộ runtime.

## Phạm vi

Không có SQL migration. Không đổi schema, dữ liệu, quyền role hoặc nghiệp vụ học phí.
