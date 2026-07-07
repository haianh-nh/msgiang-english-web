# V18A Internal Interaction Performance

Mục tiêu: tăng tốc thao tác bên trong app chính mà không đổi UI/UX.

## Đã tối ưu

1. Debounce localStorage save
   - Trước đây nhiều thao tác nhỏ có thể stringify toàn bộ `db` ngay lập tức.
   - V18A gom local save lại trong khoảng ngắn để giảm giật UI.
   - Save backend `/api/v48-state` vẫn giữ debounce cũ.

2. Fast index cho class/student
   - `classById`, `studentById`, `allStudents` dùng Map cache thay vì duyệt toàn bộ lớp/học sinh nhiều lần.

3. Memo cache cho màn học phí
   - `baseBillingRows()` được cache theo tháng, user, dữ liệu học phí và version nội bộ.
   - Giảm tính lại học phí khi cùng màn render gọi nhiều lần.

4. Memo cache cho lịch tuần
   - `weekSessionsForUser()` cache theo tuần và dữ liệu lịch.
   - Giảm tính lại lịch khi mở schedule/attendance.

5. Memo cache cho điểm danh
   - `sessionsForAttendancePage()` và `rosterForAttendance()` có cache nhẹ.
   - Giảm duyệt lại roster/học bù khi mở điểm danh.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi SQL.
- Không đổi database.
- Không đổi học phí, điểm danh, học bù, đánh giá.
- Không đổi luồng login chính.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Login vào app chính.
2. Mở Lớp học, popup lớp.
3. Mở Lịch dạy, đổi tuần.
4. Mở Điểm danh, chọn Có mặt/Muộn/Vắng, lưu.
5. Mở Học phí, lọc Paid/Unpaid, tìm học sinh, đổi tháng.
6. Mở Đánh giá, đổi tháng.
7. Reload trang để chắc chắn localStorage vẫn lưu đúng.
