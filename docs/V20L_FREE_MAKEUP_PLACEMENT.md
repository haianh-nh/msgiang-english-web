# V20L — Free Makeup Placement Logic

## Mục tiêu

Đổi logic học bù từ `cùng khối` sang `xếp tự do`.

## Logic mới

- Học sinh vắng có thể được xếp học bù vào bất kỳ lớp còn hoạt động.
- Không bắt buộc cùng khối/cùng grade.
- Chỉ được xếp vào buổi `Chưa dạy`.
- Không xếp vào buổi `Đang dạy`, `Đã dạy`, `Nghỉ`, hoặc lớp đã kết thúc/hủy.
- Không xếp vào chính lớp gốc của lượt vắng.
- Vẫn giữ giới hạn sĩ số tối đa.
- Một lượt vắng chỉ được xếp học bù một lần.
- Hủy học bù thì lượt vắng quay lại danh sách chờ xếp.

## UI mới

Trong popup `Xếp học bù`:

- Có ô tìm kiếm theo tên học sinh, lớp gốc, buổi vắng, ghi chú.
- Danh sách chờ gồm học sinh từ mọi khối.
- Mỗi dòng hiển thị học sinh, khối/lớp gốc, buổi vắng và lý do.

## Backend

`POST /api/makeup/plans` bỏ kiểm tra cùng khối và thêm kiểm tra:

- target class phải còn hoạt động,
- target session phải là buổi chưa dạy,
- absence phải đang pending,
- absence chưa có makeup plan khác,
- target session chưa đủ sĩ số,
- học sinh chưa có trong target session.

## Không cần SQL

Bản này không đổi database schema.
