# V20N.2 — Table Contrast UI Fix

## Mục tiêu

Sửa lỗi các bảng có nền header hồng nhạt nhưng chữ gần trắng/trắng làm khó đọc, đặc biệt ở màn Học phí.

## Phạm vi sửa

Sửa bằng CSS global cho các bảng dữ liệu:

- `.tableWrap` — Học phí, Điểm danh, Học bù và các bảng dữ liệu chung.
- `.modalTableWrap` / `.modalTable` — popup chi tiết lớp, popup vắng/học bù, bảng trong modal.

Không đổi thiết kế riêng của bảng lịch dạy `.timetable`.

## Nội dung sửa

- Header bảng dùng nền hồng nhạt nhưng chữ đỏ đậm, có `!important` để override các rule cũ.
- Ô dữ liệu dùng chữ xám đậm/đen để tăng tương phản.
- `.mini`, `.money`, `.paidBadge`, `.unpaidBadge`, `.sentBadge` trong bảng được khóa lại màu dễ đọc.
- Hover dòng bảng không làm chữ bị chìm nền.

## SQL

Không cần SQL.
