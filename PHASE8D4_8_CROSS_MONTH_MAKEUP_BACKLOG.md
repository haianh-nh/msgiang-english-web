# Phase 8D.4.8 – Cross-month Makeup Backlog

## Mục tiêu

Giữ các lượt vắng chưa được học bù trong danh sách Chờ xếp khi chuyển sang tháng mới.

## Thay đổi

- `/api/makeup/state` vẫn tải dữ liệu chi tiết theo tháng đang xem, đồng thời bổ sung toàn bộ `official_absence_records` còn `pending` từ các tháng chưa bị xóa.
- Loại các lượt có plan `scheduled` hoặc `completed` để tránh hiển thị trùng do dữ liệu cũ không đồng bộ.
- Tab Học bù hiển thị backlog toàn bộ tháng; phần Đã xếp và Đã học bù vẫn lọc theo tháng đang chọn.
- Popup xếp học bù trong Lịch dạy và popup tạo lớp Học kèm dùng cùng backlog toàn bộ tháng.
- Mỗi lượt hiển thị ngày/buổi nghỉ gốc và tháng phát sinh.
- Cache Học bù dùng schema mới `all-open-v1` để không dùng lại cache cũ chỉ chứa một tháng.

## Không thay đổi

- Không thay đổi công thức điểm danh.
- Không thay đổi quyền role.
- Không tự xóa dữ liệu khi sang tháng mới.
- Không cần migration SQL.
