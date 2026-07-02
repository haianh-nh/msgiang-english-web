# Security login + Admin password

Bản này xử lý:

1. Form đăng nhập không tự điền `admin` / `123456`.
2. Tắt hàm đăng nhập nhanh production.
3. Thêm khối đổi mật khẩu trong Cài đặt.

## Đổi mật khẩu Admin

Đăng nhập bằng Admin, vào:

Cài đặt → Đổi mật khẩu tài khoản

Nhập mật khẩu mới hai lần, bấm Đổi mật khẩu.

API sử dụng: `POST /api/auth/change-password`.
