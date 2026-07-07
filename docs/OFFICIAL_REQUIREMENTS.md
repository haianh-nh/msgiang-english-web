# Official requirements

Các yêu cầu đã chốt cho bản chính thức:

1. Demo V48 là bản UI/UX và workflow chuẩn cuối cùng.
2. Bỏ hẳn vai trò phụ huynh.
3. Học phí mặc định: 70.000đ / buổi.
4. Admin chỉnh được học phí trong Cài đặt.
5. Giới hạn 15 học sinh / buổi, tính cả học sinh chính thức + học bù.
6. Nhập dữ liệu lớp bằng cả 2 cách: nhập tay trên web và import file.
7. Bản này là UI-first port: giao diện được giữ từ HTML V48 để nghiệm thu UI trước khi nối backend.

## Quy trình tiếp theo

- Bước 1: chạy bản này và kiểm tra UI có giống V48 hay chưa.
- Bước 2: nếu UI được duyệt, mới tách CSS/JS thành component Next.js.
- Bước 3: nối từng action trong V48 với Supabase/API thật, không thay đổi UI.
