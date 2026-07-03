# V13 Lazy Load Tabs

Mục tiêu: tăng tốc phản hồi bằng cách không tải toàn bộ dữ liệu sau login.

## Thay đổi kỹ thuật

- Login/bootstrap chỉ tải dữ liệu core: user, settings, classes.
- Các module nặng tải khi mở tab:
  - schedule/makeup → `/api/schedule/state`
  - attendance → `/api/schedule/state` + `/api/attendance/state`
  - tuition → `/api/tuition/state`
  - homework/library → `/api/library`
  - evaluation → `/api/evaluations`
  - teachers/settings → `/api/teachers`
- Có trạng thái loading riêng từng tab.
- Khi đổi tuần/tháng, chỉ refresh đúng module.

## Không thay đổi

- Không đổi Supabase schema.
- Không đổi API contract.
- Không đổi logic học phí, điểm danh, học bù, đánh giá.
- Không đổi flow UI/UX đã chốt.

## Test bắt buộc

1. Login Admin.
2. Mở Lớp học: phải hiện nhanh.
3. Mở Lịch dạy: thấy loading rồi hiện lịch.
4. Mở Điểm danh: thấy loading rồi hiện dữ liệu.
5. Mở Học phí: thấy loading rồi hiện học phí đúng tháng.
6. Đổi tháng học phí: dữ liệu phải refresh đúng.
7. Mở Đánh giá: dữ liệu đúng tháng.
8. Login giáo viên: chỉ thấy lớp được phân quyền.
