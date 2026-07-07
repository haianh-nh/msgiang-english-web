# V20B.10 — Server-visible class makeup fix

## Vấn đề

Database đã đúng: `teacher_id` trong `official_class_makeup_sessions` khớp với `official_teachers.id` của tài khoản giáo viên. Nhưng giáo viên vẫn không thấy buổi dạy bù trong Lịch dạy.

## Nguyên nhân

Frontend đang phải tự quyết định buổi dạy bù nào thuộc về giáo viên. Nếu dữ liệu teacher/class snapshot bị thiếu hoặc cache cũ còn rỗng, buổi dạy bù không được đưa vào lịch.

## Đã sửa

1. `/api/schedule/state` giờ quyết định visibility ở server:
   - Admin/Manager: nhận toàn bộ class makeup active.
   - Teacher: chỉ nhận class makeup nếu:
     - `official_class_makeup_sessions.teacher_id` bằng teacher hiện tại, hoặc
     - class chính thuộc teacher đó.

2. API trả thêm:
   - `currentTeacherId`
   - `visibleToCurrentUser: true`
   - `classSnapshot`

3. Frontend hiển thị class makeup nếu `visibleToCurrentUser === true`.

4. `refreshOfficialScheduleState()` apply lại payload nếu server trả buổi dạy bù mà local chưa có, kể cả khi hash/cached state chưa cập nhật.

## Không thay đổi

- Không cần SQL mới so với V20B.6.
- Không đổi UI tổng thể.
- Không đổi thao tác xếp dạy bù.
