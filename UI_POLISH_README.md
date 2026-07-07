# UI polish backup

Bản này dựa trên backup final học bù optimized và đã chỉnh giao diện:

- Tăng tương phản chữ phụ, chữ trong bảng và header lịch.
- Sửa lỗi màu chữ header bảng bị chìm do `th` màu trắng trên nền hồng nhạt.
- Giảm cảm giác chữ bị giãn/mở ở tiêu đề, bảng, lịch.
- Gọn bớt các khối note/hướng dẫn không cần thiết ở Học bù, Học phí, Đánh giá, popup xếp học bù.
- Đổi cache version asset từ `20opt1` sang `20ui1` để trình duyệt tải CSS/JS mới.

Build đã kiểm tra bằng:

```bash
NEXT_TELEMETRY_DISABLED=1 CI=1 npm run build
```
