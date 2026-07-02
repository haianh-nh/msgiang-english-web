# Ms.Giang English Web v1

Project web thật dùng Next.js + Supabase.

## Chức năng chính

- Đăng nhập nội bộ bằng tài khoản/SĐT + mật khẩu.
- Role: Admin, Quản lí, Giáo viên.
- Bỏ cổng phụ huynh đăng nhập, chỉ giữ thông tin liên hệ phụ huynh trong hồ sơ học sinh.
- Lớp học: lớp đang học / lớp đã học, tạo lớp, chuyển lớp tạo lớp mới, xóa lớp có xác nhận mật khẩu.
- Học sinh: thêm/xóa học sinh.
- Điểm danh: có mặt / muộn / vắng, Admin/Quản lí có thể sửa điểm danh đã đóng.
- Học phí: tạo ảnh ngang gửi phụ huynh.
- Đánh giá: tạo ảnh ngang, biểu đồ bên trái và nhận xét bên phải.
- Thư viện bài tập: PDF/audio upload lên Supabase Storage.

## Cài đặt

```bash
npm install
cp .env.example .env.local
```

Điền biến môi trường trong `.env.local`.

## Supabase

1. Chạy SQL trong `supabase/migrations/001_schema.sql`.
2. Tạo bucket Storage tên `exercise-library`.
3. Chạy:

```bash
npm run seed:admin
```

Tài khoản đầu tiên:

```text
admin / 123456
```

## Chạy local

```bash
npm run dev
```

Sau đó mở `http://localhost:3000`.

## Ghi chú

Đây là bản khung web thật v1 để triển khai từ demo v48. Các phần giao diện và logic chính đã được tách thành code Next.js/Supabase, không còn lưu bằng localStorage.
