# V20B.6 — Class makeup teacher assignment

## Mục tiêu

Trong popup dạy bù cả lớp, thêm ô chọn giáo viên dạy bù. Khi giáo viên được chỉ định đăng nhập và xem Lịch dạy, buổi dạy bù phải hiển thị trong lịch của giáo viên đó, kể cả khi giáo viên đó không phải giáo viên chính của lớp.

## Thay đổi

### Database

Thêm cột `teacher_id` vào bảng `official_class_makeup_sessions`.

File SQL mới:

`supabase/migrations/011_class_makeup_teacher.sql`

### API

1. `/api/schedule/class-makeup`
   - nhận `teacherId`,
   - lưu `teacher_id`,
   - trả về `teacherId` và `teacher`.

2. `/api/schedule/state`
   - trả về teacher được gán cho từng buổi dạy bù.

3. `/api/classes`
   - với tài khoản giáo viên, ngoài lớp giáo viên đang dạy chính, API còn trả thêm lớp có buổi dạy bù được gán cho giáo viên đó. Việc này giúp lịch dạy bù có đủ thông tin lớp/học sinh để hiển thị.

### Frontend

1. Popup `Xếp / đổi lịch dạy bù`
   - thêm ô `Giáo viên dạy bù`.

2. Khi lưu lịch dạy bù
   - bắt buộc chọn giáo viên.

3. Lịch dạy
   - buổi dạy bù dùng giáo viên đã gán thay vì giáo viên chính của lớp.
   - giáo viên được gán sẽ nhìn thấy buổi dạy bù trong lịch của mình.

## Cần chạy SQL

Bản này cần chạy migration `011_class_makeup_teacher.sql` trên Supabase trước hoặc cùng lúc deploy.

## Không thay đổi

- Không đổi UI tổng thể.
- Không đổi logic nghỉ buổi.
- Không đổi logic học bù học sinh.
