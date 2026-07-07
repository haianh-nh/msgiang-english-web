# V20L.3 — Makeup UI & Data Fix

## Mục tiêu

Sửa hai lỗi chính:

1. Popup **Xếp học bù** trong Lịch dạy bị lỗi UI/khó thao tác, nhất là trên mobile.
2. Tab **Học bù** không hiện dữ liệu chờ xếp vì route này trước đó chỉ tải dữ liệu schedule, chưa tải dữ liệu attendance/absence.

## Đã sửa

### 1. Route Học bù tải đủ dữ liệu

Tab `Học bù` bây giờ tải đồng thời:

- `/api/schedule/state` để lấy makeup plans đã xếp,
- `/api/attendance/state` để lấy absence records chờ xếp.

Như vậy thẻ `Học bù` sẽ hiện đúng:

- Lượt vắng,
- Chờ xếp,
- Đã xếp.

### 2. Trang Học bù có bảng Chờ xếp

Thêm riêng bảng:

- Chờ xếp học bù,
- Đã xếp học bù.

Có nút `Tải lại dữ liệu` để Admin/Manager/Teacher refresh nhanh sau khi lưu điểm danh.

### 3. Popup Xếp học bù đổi sang card UI

Danh sách học sinh chờ xếp trong popup Lịch dạy chuyển từ bảng dài sang card:

- dễ bấm hơn,
- không tràn ngang mobile,
- hiển thị rõ học sinh/lớp vắng/buổi vắng/lý do,
- vẫn có ô tìm kiếm theo tên/lớp/buổi vắng.

### 4. Logic học bù giữ nguyên V20L

- Xếp tự do, không bắt buộc cùng khối.
- Chỉ xếp vào buổi `Chưa dạy`.
- Không xếp vào lớp đã kết thúc/hủy.
- Không xếp vào chính lớp gốc.
- Không xếp quá sĩ số.

## Không cần SQL

Bản này chỉ sửa frontend data loading/UI. Không thêm bảng/cột.
