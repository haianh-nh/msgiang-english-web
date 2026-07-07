# V20M — Edit Active Class Only

## Logic chốt

- Chỉ lớp đang học (`active`) mới được Admin/Quản lí chỉnh sửa.
- Lớp đã kết thúc / lớp đã học (`ended`) bị khóa hoàn toàn ở chức năng chỉnh sửa:
  - không hiện nút sửa lớp,
  - không thêm học sinh,
  - không xóa học sinh,
  - không chuyển lớp,
  - không mở lại lớp,
  - không xóa lớp đã kết thúc qua API,
  - backend cũng chặn PATCH class / thêm học sinh / xóa học sinh / chuyển lớp nếu lớp đã kết thúc.

## Tính năng mới

Trong popup chi tiết lớp đang học có nút **Sửa lớp**.

Cho sửa:

- Tên lớp
- Giáo viên
- Trợ giảng / TA
- Số buổi/tuần
- Thứ học
- Khung giờ học
- Ngày bắt đầu
- Ghi chú lớp

## Validate

- Tên lớp không được trống.
- Tên lớp không được trùng lớp đang học khác.
- Hai buổi học không được trùng cùng thứ và cùng khung giờ.
- Giờ bắt đầu phải nhỏ hơn giờ kết thúc.
- Nếu đổi lịch và lớp có học bù tương lai đã xếp vào lịch cũ, hệ thống chặn đổi lịch.
- Nếu đổi lịch khi lớp đã có điểm danh trong tuần, hệ thống cảnh báo trước khi lưu.

## Không cần SQL

Bản này không thêm bảng/cột database.
