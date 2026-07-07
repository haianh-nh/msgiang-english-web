# V20B.2 — Class makeup persistence fix

## Vấn đề

Sau khi cho nghỉ buổi học và xếp lịch dạy bù, lịch dạy bù hiện lúc đầu nhưng sau khi refresh vẫn bị mất.

## Nguyên nhân sâu hơn

V20B.1 đã lấy thêm lịch dạy bù theo `source_session_key` của buổi nghỉ trong tuần đang xem. Tuy nhiên frontend còn cần giữ đủ dữ liệu lịch dạy bù cả lớp để xử lý 2 ngữ cảnh:

1. Tuần có buổi nghỉ cần biết buổi đó đã được xếp dạy bù ở ngày nào.
2. Tuần có ngày dạy bù cần hiển thị buổi dạy bù như một buổi học riêng.

Nếu API chỉ trả dữ liệu theo một khoảng tuần, vẫn có trường hợp cache/render sau refresh không đủ dữ liệu để liên kết buổi nghỉ với buổi dạy bù.

## Đã sửa

1. `/api/schedule/state` trả về toàn bộ `official_class_makeup_sessions` đang active.
2. Frontend tự lọc buổi dạy bù theo tuần khi dựng thời khóa biểu.
3. Thêm helper:
   - `classMakeupForSourceSession(sessionKey)`
   - `classMakeupLabel(makeup)`
4. Thẻ buổi nghỉ giờ hiển thị rõ:
   - `Dạy bù: <ngày> • <giờ>`
   - nút `Đổi dạy bù` nếu đã xếp rồi
   - nút `Xếp dạy bù` nếu chưa xếp

## Không thay đổi

- Không đổi database/SQL.
- Không đổi luồng thao tác.
- Không đổi quyền tài khoản.
