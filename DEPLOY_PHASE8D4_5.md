# Deploy Phase 8D.4.5 — Staff Main-Class Cards

## Thay đổi

- Ẩn hoàn toàn lớp Học kèm khỏi thẻ Giáo viên, TA và Quản lí.
- Số `X lớp` và nhãn `+X lớp` chỉ tính lớp chính.
- Tìm kiếm trong trang Nhân sự không còn khớp theo tên lớp Học kèm trên thẻ.
- Popup phân công vẫn giữ dữ liệu đầy đủ để không ảnh hưởng thao tác quản lý.
- Không thay đổi API, database, lịch dạy hoặc nghiệp vụ Học kèm.

## Kiểm tra

```bash
npm ci
npm run verify
```

Build: `20phase8d4-5-staff-main-class-cards`
