# V20B.7 — Class makeup teacher visibility fix

## Vấn đề

Admin chọn giáo viên dạy bù cả lớp và lưu thành công. Nhưng khi giáo viên đó đăng nhập vào Lịch dạy thì không thấy buổi dạy bù.

## Nguyên nhân

Frontend cần thông tin lớp để dựng thẻ buổi dạy bù. Với giáo viên không phải giáo viên chính của lớp, lớp đó có thể không nằm trong danh sách lớp thường của giáo viên. Khi thiếu class object, buổi dạy bù bị lọc hoặc không render được.

## Đã sửa

1. `/api/schedule/state` trả thêm `classSnapshot` cho từng `classMakeupSession`, gồm:
   - thông tin lớp,
   - giáo viên chính,
   - danh sách học sinh cơ bản.

2. Frontend merge `classSnapshot` vào `db.classes` khi hydrate/refresh schedule.

3. `weekSessionsForUser()` không còn phụ thuộc hoàn toàn vào `classById()` để render dạy bù:
   - nếu thiếu class trong core data, dùng `classSnapshot` làm fallback.

4. Lịch giáo viên hiển thị buổi dạy bù nếu:
   - giáo viên là giáo viên chính/TA của lớp, hoặc
   - giáo viên được gán trực tiếp trong `teacher_id` của buổi dạy bù.

5. Cache-bust JS sang `?v=20b7`.

## Không thay đổi

- Không cần SQL mới so với V20B.6.
- Không đổi UI tổng thể.
- Không đổi logic xếp dạy bù.
