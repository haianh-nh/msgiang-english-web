# V20B.17 — Schedule actions popup only

## Mục tiêu

Giữ nguyên toàn bộ logic lịch học / học bù / dạy bù, chỉ chỉnh UI:

- Ẩn các nút chức năng trực tiếp trên thẻ lịch học.
- Chuyển toàn bộ nút thao tác vào popup khi bấm vào lớp/buổi học.
- Ngoài lịch chỉ hiển thị trạng thái và thông tin ngắn.

## Các nút đã chuyển vào popup

- Mở điểm danh
- Xếp học bù
- Cho nghỉ
- Xếp dạy bù
- Đổi dạy bù
- Hủy dạy bù
- Mở lại buổi học
- Xem vắng

## Ngoài thẻ lịch chỉ còn hiển thị

- Trạng thái buổi học
- Nghỉ buổi học
- Dạy bù cả lớp
- Dạy bù: ngày/giờ/giáo viên
- Số học sinh học bù nếu có

## Không thay đổi

- Không đổi API.
- Không đổi database.
- Không đổi quyền Admin/Quản lí/Giáo viên.
- Không đổi logic dạy bù/học bù/điểm danh.
- Không cần SQL mới.
