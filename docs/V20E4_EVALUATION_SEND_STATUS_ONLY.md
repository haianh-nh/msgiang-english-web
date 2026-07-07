# V20E.4 — Evaluation send status only

## Mục tiêu

Đơn giản hóa nút `Chốt/Gửi` ở phần Đánh giá học sinh.

## Thay đổi

- Đổi chữ nút `Chốt/Gửi` thành `Gửi`.
- Khi bấm `Gửi`, hệ thống chỉ đổi trạng thái đánh giá sang `published`.
- Trên giao diện, `published` được hiển thị là `Đã gửi`.
- `draft` được hiển thị ngắn gọn là `Nháp`.
- Toast sau khi gửi là `Đã gửi đánh giá`.

## Không làm

- Không tạo/link tài khoản phụ huynh.
- Không gửi Zalo/SMS/email.
- Không tạo thông báo cho phụ huynh.
- Không đổi database.
- Không đổi API.

## Ghi chú kỹ thuật

Backend vẫn dùng giá trị `published` để giữ tương thích với API hiện tại.  
Frontend chỉ đổi cách hiển thị thành `Đã gửi`.
