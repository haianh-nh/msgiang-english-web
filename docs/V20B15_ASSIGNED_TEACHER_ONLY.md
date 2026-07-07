# V20B.15 — Assigned teacher only for class makeup

## Vấn đề

Khi đăng nhập tài khoản giáo viên Hải Anh, lịch vẫn hiện cả buổi dạy bù được gán cho Ms. Kate. Nguyên nhân là logic visibility đang cho giáo viên chính của lớp thấy mọi buổi dạy bù của lớp đó, kể cả khi buổi dạy bù đã được chỉ định cho giáo viên khác.

## Đã sửa

### Server

Trong:

- `/api/schedule/state`
- `/api/schedule/class-makeup/visible`

Teacher chỉ nhận class makeup nếu:

1. `teacher_id` của buổi dạy bù khớp giáo viên đang login.
2. Nếu dữ liệu cũ chưa có `teacher_id`, mới fallback về giáo viên chính của lớp.

### Frontend

Trong `weekSessionsForUser()`:

- Admin/Manager vẫn thấy tất cả.
- Teacher chỉ thấy class makeup nếu:
  - server trả `visibleToCurrentUser = true`, hoặc
  - `teacherId` của buổi dạy bù khớp teacher hiện tại.
- Không còn dùng `allowed.has(classId)` để hiện mọi dạy bù của lớp cho giáo viên chính.

## Không thay đổi

- Không cần SQL mới.
- Không đổi UI.
- Không đổi thao tác xếp dạy bù.
