# V20B.19 — Keyboard UX shortcuts

## Mục tiêu

Thêm thao tác bàn phím tiện hơn, không đổi logic nghiệp vụ.

## Phím tắt đã thêm

### Login

- Ở màn hình đăng nhập, khi đang nhập tài khoản/mật khẩu:
  - `Enter` = Đăng nhập

### Đổi mật khẩu bắt buộc

- Khi tài khoản đang phải đổi mật khẩu tạm:
  - `Enter` = Lưu mật khẩu mới

### Popup/form ngắn

- Khi đang focus vào input/select trong popup:
  - `Enter` = bấm nút chính trong popup

Ví dụ:
- Thêm lớp mới
- Xếp/đổi lịch dạy bù
- Các popup form ngắn có nút chính

### Textarea

- `Enter` vẫn xuống dòng bình thường
- `Ctrl + Enter` trên Windows hoặc `Cmd + Enter` trên Mac = bấm nút chính của popup

### Popup

- `Esc` = đóng popup hiện tại

## Giới hạn an toàn

- Không bind Enter toàn app.
- Không tự bấm nút trong popup chỉ xem thông tin nếu người dùng không focus input/select/textarea.
- Không đổi API.
- Không đổi database.
- Không đổi logic lịch học/học bù/dạy bù/điểm danh.
