# V20B.1 — Class makeup refresh fix

## Vấn đề

Khi cho một buổi học nghỉ rồi xếp lịch dạy bù, lịch dạy bù hiện ngay lúc đầu. Nhưng sau khi refresh trang, lịch dạy bù bị mất khỏi thẻ buổi nghỉ.

## Nguyên nhân

API `/api/schedule/state` đang lọc `official_class_makeup_sessions` theo `makeup_date` trong tuần đang xem.

Trường hợp thường gặp:
- buổi nghỉ nằm ở tuần hiện tại,
- lịch dạy bù được xếp sang tuần sau.

Khi refresh ở tuần hiện tại, API chỉ lấy lịch dạy bù có ngày trong tuần hiện tại nên lịch dạy bù của buổi nghỉ bị thiếu.

## Đã sửa

API `/api/schedule/state` giờ trả về lịch dạy bù theo 2 điều kiện:

1. `makeup_date` nằm trong tuần đang xem.
2. Hoặc `source_session_key` thuộc các buổi nghỉ của tuần đang xem.

Nhờ vậy:
- xem tuần có buổi nghỉ vẫn thấy lịch dạy bù đã xếp,
- xem tuần có ngày dạy bù vẫn thấy buổi dạy bù,
- refresh trang không làm mất dữ liệu lịch dạy bù.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi database/SQL.
- Không đổi luồng xếp lịch dạy bù.
