# Ms.Giang English Center

Bản ổn định hiện tại: `20phase8d4-11-library-pdf-tab-fix`.

- App core: khoảng 234 KB.
- CSS core: khoảng 59 KB.
- Không cần migration SQL cho Phase 8D.4.11.
- Thẻ và popup Giáo viên/TA/Quản lí chỉ hiển thị lớp chính; dropdown gán lớp cũng loại lớp Học kèm.
- Điểm danh Giáo viên/TA dùng giờ Việt Nam cố định và hỗ trợ hồ sơ giáo viên cũ/trùng.
- Danh sách Chờ xếp học bù lấy toàn bộ lượt vắng chưa xử lý từ các tháng trước.
- Thư viện bài tập xem trước PDF và DOCX trong popup; các nút thẻ được chuẩn hóa thành Xem trước, Tải xuống và Xóa.
- File được nhận diện theo phần mở rộng/MIME thật, nên PDF lưu nhầm nhãn Word vẫn chuyển đúng tab.
- Tab Word/PDF/Audio hoạt động độc lập; bấm PDF không còn bị ép quay về Word và trạng thái tab được giữ sau reload.
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
- `public/v15/modules/library.js`: thẻ tài liệu và giao diện Thư viện.
- `public/v15/modules/homework-library-runtime.js`: upload, xem trước và tải tài liệu.
