# Ms.Giang English Center

Bản hiện tại: **Phase 8D.2 — Linked Runtime Module Split**  
Build: `20phase8d2-linked-runtime-module-split`

## Kiểm tra trước deploy

```bash
npm ci
npm run verify
```

## Cấu trúc frontend chính

- `public/v15/app.js`: core đăng nhập, router, state, cache và realtime coordinator.
- `public/v15/module-loader.js`: tải module theo route/dependency.
- `public/v15/modules/classes-runtime.js`: popup và mutation Lớp học.
- `public/v15/modules/attendance-runtime.js`: mutation Điểm danh.
- `public/v15/modules/schedule-actions.js`: thao tác Lịch dạy/Học bù.
- `public/v15/modules/makeup.js`: trang Học bù.
