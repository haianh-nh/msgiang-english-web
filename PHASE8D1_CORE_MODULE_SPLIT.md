# Phase 8D.1 — Core Module Split

Không có migration SQL mới.

## Tách khỏi app core

- `public/v15/modules/staff.js`
- `public/v15/modules/settings.js`
- `public/v15/modules/student-transfer.js`
- `public/v15/modules/homework-library-runtime.js`

`student-transfer.js` chỉ tải khi bấm Chuyển lớp hoặc Lịch sử. `staff.js` và `settings.js` tải theo route.

## Kiểm tra

```bash
npm ci
npm run verify
```
