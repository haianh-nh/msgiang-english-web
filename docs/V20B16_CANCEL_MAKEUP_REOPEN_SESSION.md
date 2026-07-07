# V20B.16 — Cancel makeup & reopen cancelled session

## Mục tiêu

Bổ sung đúng 2 chức năng:

1. Hủy dạy bù cả lớp.
2. Mở lại buổi học đã đánh nghỉ.

## Hủy dạy bù

- Admin/Quản lí có thể hủy lịch dạy bù cả lớp.
- Không xóa cứng database.
- API chỉ đổi `official_class_makeup_sessions.status = cancelled`.
- Sau khi hủy:
  - buổi dạy bù biến mất khỏi lịch giáo viên được gán,
  - buổi nghỉ gốc vẫn còn,
  - buổi nghỉ quay lại trạng thái có thể xếp dạy bù lại.
- Nếu buổi dạy bù đã có điểm danh, hệ thống chặn hủy.

## Mở lại buổi học đã nghỉ

- Nút `Mở lại buổi học` chỉ hiện trong popup khi bấm vào buổi học đang trạng thái Nghỉ.
- Chỉ Admin/Quản lí thấy nút này.
- Khi mở lại:
  - xóa trạng thái nghỉ khỏi `official_session_cancellations`,
  - nếu có lịch dạy bù liên quan và chưa điểm danh thì hủy mềm lịch dạy bù đó.
- Nếu lịch dạy bù liên quan đã có điểm danh:
  - không cho mở lại,
  - hiển thị thông báo chặn.

## Không thay đổi

- Không cần SQL mới.
- Không đổi UI tổng thể.
- Không đổi logic học bù học sinh.
- Không xóa cứng dữ liệu dạy bù.
