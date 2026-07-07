# Backend V4 scope: Lịch dạy + điểm danh + học bù

Bản này bao gồm đầy đủ giai đoạn 3 và giai đoạn 4 trên UI V48 đã duyệt.

## Giai đoạn 3

1. Thời khóa biểu tuần lấy dữ liệu lớp/lịch thật.
2. Tuần trước / tuần sau giữ nguyên UI V48.
3. Trạng thái Đã dạy / Đang dạy / Chưa dạy / Nghỉ.
4. Hủy buổi học lưu thật vào `official_session_cancellations`.
5. Xếp lịch dạy bù cả lớp lưu thật vào `official_class_makeup_sessions`.
6. Xếp học bù từng học sinh lưu thật vào `official_makeup_plans`.
7. API kiểm tra giới hạn sĩ số chính thức + học bù theo setting `session_capacity`.

## Giai đoạn 4

1. Điểm danh theo đúng buổi học `sessionKey`.
2. Lưu trạng thái Có mặt / Muộn / Vắng / Ghi chú vào Supabase.
3. Khi lưu điểm danh, học sinh chính thức bị Vắng tự sinh vào `official_absence_records`.
4. Popup Xếp học bù dùng danh sách vắng thật từ `official_absence_records`.
5. Không tạo dữ liệu vắng mẫu giả trong UI chính thức.

## API mới

- `GET /api/schedule/state`
- `POST /api/schedule/cancellations`
- `DELETE /api/schedule/cancellations?sessionKey=...`
- `POST /api/schedule/class-makeup`
- `POST /api/makeup/plans`
- `DELETE /api/makeup/plans/[id]`
- `GET /api/attendance/state`
- `POST /api/attendance/save`

## Migration mới

- `supabase/migrations/003_schedule_makeup.sql`
- `supabase/migrations/004_attendance_absences.sql`
