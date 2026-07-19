# Deploy Phase 8D.4.6 — Staff Tutoring Visibility Fix

## Thay đổi

- Ẩn hoàn toàn lớp Học kèm khỏi thẻ Giáo viên, TA và Quản lí.
- Popup **Thông tin giáo viên** chỉ hiển thị lớp chính trong mục **Lớp đang phụ trách**.
- Dropdown **Gán thêm lớp** trong popup nhân sự cũng loại lớp Học kèm.
- Số `X lớp`, nhãn `+X lớp` và tìm kiếm nhân sự chỉ dựa trên lớp chính.
- Bổ sung nhận diện lớp Học kèm theo tên, grade, note, session kind và source session key.
- Không thay đổi dữ liệu, API, lịch dạy hoặc nghiệp vụ Học kèm ở các tab khác.

## Kiểm tra

```bash
npm ci
npm run verify
```

Build: `20phase8d4-6-staff-tutoring-visibility-fix`
