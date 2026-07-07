# V19C Attendance Module

Mục tiêu: tách module Điểm danh thật cẩn thận, chỉ tách phần render UI trước, không đụng logic lưu/API.

## Đã làm

1. Tách phần render Điểm danh ra file riêng:
   - `public/v15/modules/attendance.js`

2. Các phần đã chuyển khỏi app core:
   - `attendancePage()`
   - `attendanceStatusButtons()`
   - `openAttendance()`

3. Các phần cố tình giữ trong app core để an toàn:
   - `setAttendanceStatus()`
   - `setAttendanceNote()`
   - `saveAttendance()`
   - `editAttendance()`
   - `attendanceRecord()`
   - `rosterForAttendance()`
   - `addManualMakeupToAttendance()`
   - các API/logic cập nhật học bù/học phí

4. `public/index-v15.html` tải module theo thứ tự:
   - `/v15/modules/classes.js`
   - `/v15/modules/schedule.js`
   - `/v15/modules/attendance.js`
   - `/v15/app.js`

## Kết quả

- `public/v15/app.js` trước: 497,862 bytes.
- `public/v15/app.js` sau: 492,091 bytes.
- Module mới: `public/v15/modules/attendance.js`.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi bảng điểm danh.
- Không đổi nút Có mặt / Muộn / Vắng.
- Không đổi ghi chú học sinh.
- Không đổi logic lưu điểm danh.
- Không đổi logic tạo absence/học bù.
- Không đổi logic cập nhật học phí sau điểm danh.
- Không đổi SQL.
- Không đổi database.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Mở app chính.
2. Login Admin.
3. Mở Điểm danh.
4. Kiểm tra danh sách buổi học giống bản trước.
5. Mở một buổi điểm danh.
6. Bấm Có mặt / Muộn / Vắng cho vài học sinh.
7. Nhập ghi chú.
8. Thêm học bù thủ công nếu còn chỗ.
9. Bấm Lưu điểm danh.
10. Đóng/mở lại buổi đó, kiểm tra dữ liệu vẫn giữ.
11. Mở Lịch dạy, kiểm tra số vắng/học bù cập nhật.
12. Mở Học phí, kiểm tra số buổi tính tiền cập nhật.

## Ghi chú

V19C không tách save/API để tránh rủi ro mất dữ liệu. Bước này chỉ tách render UI của Điểm danh.
