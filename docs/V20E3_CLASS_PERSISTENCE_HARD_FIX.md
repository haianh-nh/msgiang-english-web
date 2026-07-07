# V20E.3 — Class persistence hard fix

## Vấn đề người dùng báo

Sau khi thao tác `Chuyển lớp` hoặc `Kết thúc lớp`, UI có thể đổi tạm thời nhưng sau khi refresh lại trở về như chưa thao tác.

## Nguyên nhân xử lý

### 1. PATCH lớp chưa đủ chắc

Route `PATCH /api/classes/:id` trước đó gửi `updated_at` vào `official_classes`. Một số schema Supabase hiện tại có thể không có cột này, làm update status/endDate không persist được.

V20E.3 bỏ `updated_at` khỏi PATCH để tương thích schema đang chạy.

### 2. Chuyển lớp cần server-side endpoint riêng

Frontend nhiều bước dễ tạo cảm giác local đã đổi nhưng DB chưa hoàn tất.

V20E.3 thêm:

```text
POST /api/classes/transfer
```

Endpoint này làm trên server:

1. kiểm tra lớp cũ,
2. tạo lớp mới,
3. tạo lịch lớp mới,
4. copy học sinh được chọn sang lớp mới,
5. PATCH lớp cũ thành `ended`,
6. trả lại `oldClass` và `newClass` đã đọc lại từ DB.

### 3. Xóa snapshot UI cũ

Sau lifecycle class, server xóa `official_v48_state` cũ để tránh snapshot giao diện cũ gây nhiễu.

## Kỳ vọng sau sửa

- Kết thúc lớp: lớp xuống `Lớp đã học`, reload vẫn ở `Lớp đã học`.
- Mở lại lớp: lớp quay lại `Lớp đang học`, reload vẫn đúng.
- Chuyển lớp: lớp mới nằm ở `Lớp đang học`, lớp cũ xuống `Lớp đã học`, reload vẫn đúng.
- Dữ liệu lớp cũ vẫn giữ cho tới khi Admin/Quản lí xóa lớp.

## Không cần SQL mới

Sửa code backend/frontend, không yêu cầu chạy SQL.
