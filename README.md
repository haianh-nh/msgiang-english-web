# Ms.Giang English Center

Bản ổn định hiện tại: `20phase8d4-8-cross-month-makeup-backlog`.

- App core: khoảng 234 KB.
- CSS core: khoảng 59 KB.
- Không cần migration SQL cho Phase 8D.4.8.
- Thẻ và popup Giáo viên/TA/Quản lí chỉ hiển thị lớp chính; dropdown gán lớp cũng loại lớp Học kèm.
- Điểm danh Giáo viên/TA dùng giờ Việt Nam cố định và hỗ trợ hồ sơ giáo viên cũ/trùng.
- Danh sách Chờ xếp học bù lấy toàn bộ lượt vắng chưa xử lý từ các tháng trước.
- Chạy `npm run verify` trước khi deploy.

## Kiểm tra trước deploy

```bash
npm ci
npm run verify
```

## Cấu trúc frontend chính

- `public/v15/app.js`: core đăng nhập, router, state, cache và realtime coordinator.
- `public/v15/module-loader.js`: tải module theo route/dependency.
- `public/v15/modules/dashboard.js`: Dashboard/Tổng quan.
- `public/v15/modules/tuition.js`: trang và runtime Học phí.
- `public/v15/modules/evaluation.js`: trang và runtime Đánh giá học sinh.
- `public/v15/modules/report-images.js`: helper tạo ảnh Đánh giá.
- `public/v15/modules/classes-runtime.js`: popup và mutation Lớp học.
- `public/v15/modules/attendance-runtime.js`: mutation Điểm danh.
- `public/v15/modules/schedule-actions.js`: thao tác Lịch dạy/Học bù.
- `public/v15/modules/makeup.js`: trang Học bù.
