# V9 Login Refresh Fix

Sửa hiện tượng sau khi login đôi khi thấy số học sinh demo cũ (ví dụ 196 học sinh), refresh mới hết.

## Nguyên nhân

Login cũ render giao diện ngay sau khi xác thực, trong khi localStorage/snapshot cũ vẫn còn dữ liệu demo.
Sau khi refresh trang, bootstrap tải dữ liệu thật nên lỗi biến mất.

## Cách sửa

- Sau khi login thành công, tải dữ liệu thật từ API `/api/classes` và các state liên quan trước.
- Không render bằng SEED/demo/localStorage cũ.
- Thêm loading cho nút login.
