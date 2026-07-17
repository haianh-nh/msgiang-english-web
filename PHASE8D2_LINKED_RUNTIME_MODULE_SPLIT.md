# Phase 8D.2 — Linked Runtime Module Split

Build: `20phase8d2-linked-runtime-module-split`

## Thay đổi

- `app.js` giảm từ khoảng 663 KB xuống 553 KB.
- Tách runtime Lớp học sang `public/v15/modules/classes-runtime.js`.
- Tách thao tác Điểm danh sang `public/v15/modules/attendance-runtime.js`.
- Tách thao tác Lịch/Học bù sang `public/v15/modules/schedule-actions.js`.
- Tách trang Học bù sang `public/v15/modules/makeup.js`.
- Module loader kiểm soát dependency và chống tải lặp.
- Giữ nguyên API, database, phân quyền và nghiệp vụ.

## Kiểm tra

- `npm run audit`
- `npm run verify`
- Build production và TypeScript đạt.
- Smoke test xác nhận thứ tự tải module đúng.
