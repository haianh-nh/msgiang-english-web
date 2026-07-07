# V9 Class Delete Cleanup Fix

Sửa lỗi khi xóa lớp nhưng học phí, lịch học, điểm danh, vắng/học bù vẫn còn.

## Nguyên nhân

Một số bảng dùng `student_id` và `class_id` dạng text để phục vụ dữ liệu V48:
- `official_tuition_status`
- `official_makeup_plans`
- `official_absence_records`
- một số state lịch/điểm danh

Các bảng này không luôn tự cascade khi xóa `official_classes`.

## Sửa đổi

1. API `DELETE /api/classes/[id]` dọn dữ liệu liên quan trước khi xóa lớp:
   - lịch hủy buổi
   - lịch học bù lớp
   - kế hoạch học bù
   - điểm danh
   - vắng
   - học phí
   - đánh giá
   - học sinh
   - lịch lớp
   - snapshot UI cũ

2. Frontend khi xác nhận xóa lớp:
   - gọi API server thật
   - dọn local state
   - refresh lại lớp/lịch/điểm danh/học phí/đánh giá từ Supabase

Không cần chạy SQL mới.
