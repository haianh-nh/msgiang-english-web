# V20B.11 — Visible makeup direct fix

## Vấn đề

Admin nhìn thấy lớp nghỉ và lịch dạy bù, nhưng tài khoản giáo viên được gán vẫn không thấy lớp nghỉ/dạy bù trong Lịch dạy.

## Hướng sửa

Thêm một endpoint chuyên biệt và ép frontend tải trực tiếp dữ liệu dạy bù visible cho user hiện tại.

## Thay đổi

1. Thêm API:
   `GET /api/schedule/class-makeup/visible`

   API này:
   - xác định giáo viên hiện tại từ session,
   - trả về class makeup nếu `teacher_id` khớp giáo viên,
   - trả thêm `classSnapshot`,
   - trả thêm `classCancellations` suy luận từ `source_session_key`.

2. `refreshOfficialScheduleState()`:
   - gọi `/api/schedule/state` với `noDedupe:true`,
   - sau đó gọi thêm `/api/schedule/class-makeup/visible`,
   - merge dữ liệu dạy bù trực tiếp vào local state.

3. Khi bấm Lịch dạy / Điểm danh / Học bù:
   - reset lazy state schedule/attendance,
   - clear network cache,
   - force tải lại từ server.

## Không thay đổi

- Không cần SQL mới so với V20B.6.
- Không đổi UI tổng thể.
- Không đổi thao tác xếp dạy bù.
