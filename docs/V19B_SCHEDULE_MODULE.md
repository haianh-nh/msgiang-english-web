# V19B Schedule Module

Mục tiêu: tiếp tục V19 bằng cách tách module Lịch dạy nhưng vẫn giữ UI hiện tại y nguyên.

## Đã làm

1. Tách phần render trang Lịch dạy ra file riêng:
   - `public/v15/modules/schedule.js`

2. Các phần đã chuyển khỏi app core:
   - `schedulePage()`
   - `weeklyTable()`
   - `lessonCard()`
   - `mobileScheduleList()`

3. `public/index-v15.html` tải module theo thứ tự:
   - `/v15/modules/classes.js`
   - `/v15/modules/schedule.js`
   - `/v15/app.js`

## Kết quả

- `public/v15/app.js` trước: 504,181 bytes.
- `public/v15/app.js` sau: 497,862 bytes.
- Module mới: `public/v15/modules/schedule.js`.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi bảng lịch.
- Không đổi nút Tuần trước/Tuần sau.
- Không đổi popup buổi học.
- Không đổi logic nghỉ buổi/dạy bù/học bù.
- Không đổi SQL.
- Không đổi database.
- Không đổi login.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Mở app chính.
2. Login Admin.
3. Mở Lịch dạy.
4. Kiểm tra bảng lịch desktop giống bản trước.
5. Kiểm tra lịch mobile giống bản trước.
6. Chuyển tuần trước / tuần sau.
7. Bấm vào card buổi học để mở popup danh sách.
8. Bấm Xếp học bù.
9. Bấm Cho nghỉ và Xếp dạy bù nếu cần.
10. Quay lại Lớp học/Điểm danh/Học phí để kiểm tra không ảnh hưởng module khác.

## Ghi chú

V19B mới tách phần render Lịch dạy. Các hàm dùng chung, thao tác API và popup phức tạp vẫn nằm trong app core để giảm rủi ro.
