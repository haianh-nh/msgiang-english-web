# V20N — TA Role & Class Assignment

## Logic mới

Thêm role `ta` cho Trợ giảng.

TA được quyền trên các lớp mình được gán làm TA:

- xem lịch dạy,
- điểm danh,
- xếp học bù,
- xem/hủy học bù theo giao diện được phép,
- tạo đánh giá học sinh,
- sửa đánh giá học sinh,
- xem/thêm thư viện bài tập.

TA không được quyền quản trị:

- không xem học phí,
- không quản lý tài khoản,
- không tạo/sửa/xóa/kết thúc lớp,
- không thêm/xóa học sinh.

## Gán TA vào lớp

Lớp có 2 người phụ trách:

- `teacher_id`: giáo viên chính,
- `assistant_teacher_id`: TA / trợ giảng.

Form tạo lớp, sửa lớp và chuyển lớp đều dùng danh sách nhân sự để chọn TA, không còn chỉ nhập TA dạng text.

## Backend đã cập nhật

- `/api/classes`: tạo lớp có `assistant_teacher_id`.
- `/api/classes/:id`: sửa lớp có `assistant_teacher_id` và vẫn khóa lớp đã kết thúc.
- `/api/classes/transfer`: chuyển lớp có thể gán TA cho lớp mới.
- `/api/teachers`: tạo/sửa tài khoản có role `ta`.
- `/api/classes` GET / `fetchClassesV48()`: TA thấy lớp nếu `assistant_teacher_id` là teacher record của mình.
- `/api/attendance/save`: TA được điểm danh lớp mình được gán.
- `/api/evaluations`: TA được xem/tạo/sửa đánh giá học sinh lớp mình được gán.
- `/api/makeup/plans`: TA được xếp học bù vào lớp mình được gán.
- `/api/library`: TA được dùng thư viện bài tập như giáo viên.

## SQL bắt buộc

Chạy migration:

`supabase/migrations/20260704_v20n_ta_role_assignment.sql`

Migration này:

- thêm `official_classes.assistant_teacher_id`,
- thêm index cho `assistant_teacher_id`,
- backfill TA từ `assistant_name` nếu khớp tên giáo viên,
- cập nhật check constraint để `official_users.roles` chấp nhận role `ta`.

## Lưu ý

Bản này kế thừa V20M: lớp đã kết thúc vẫn bị khóa hoàn toàn, không cho sửa bất kỳ thông tin nào.
