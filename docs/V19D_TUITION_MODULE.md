# V19D Tuition Module

Mục tiêu: tách module Học phí thật cẩn thận, chỉ tách phần render UI trước, không đụng logic ghi dữ liệu.

## Đã làm

1. Tách phần render trang Học phí ra file riêng:
   - `public/v15/modules/tuition.js`

2. Phần đã chuyển khỏi app core:
   - `tuitionPage()`

3. Các phần cố tình giữ trong app core để an toàn:
   - `tuitionFilterState()`
   - `setTuitionFilter()`
   - `baseBillingRows()`
   - `filteredBillingRows()`
   - `visibleBillingRows()`
   - `groupBillingRowsByClass()`
   - `markPaid()`
   - `unmarkPaid()`
   - `sendTuitionMessage()`
   - `sendTuitionMessageBulk()`
   - `openTuitionMessage()`
   - `openTuitionImage()`
   - `tuitionImageData()`
   - `refreshOfficialTuitionState()`

4. `public/index-v15.html` tải module theo thứ tự:
   - `/v15/modules/classes.js`
   - `/v15/modules/schedule.js`
   - `/v15/modules/attendance.js`
   - `/v15/modules/tuition.js`
   - `/v15/app.js`

## Kết quả

- `public/v15/app.js` trước: 492,091 bytes.
- `public/v15/app.js` sau: 487,279 bytes.
- Module mới: `public/v15/modules/tuition.js`.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi filter học phí.
- Không đổi bảng học phí.
- Không đổi trạng thái Đã nộp/Chưa đóng.
- Không đổi gửi học phí phụ huynh.
- Không đổi tạo ảnh học phí.
- Không đổi logic công nợ/tháng học phí.
- Không đổi SQL.
- Không đổi database.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Mở app chính.
2. Login Admin.
3. Mở Học phí.
4. Kiểm tra bảng học phí giống bản trước.
5. Đổi tháng học phí.
6. Tìm học sinh/lớp.
7. Lọc Đã đóng / Chưa đóng.
8. Bấm Chốt/Gửi.
9. Bấm Tạo ảnh.
10. Bấm Đã nộp / Bỏ nộp.
11. Reload trang, kiểm tra trạng thái học phí vẫn đúng.
12. Mở Điểm danh và lưu thử một buổi, sau đó quay lại Học phí kiểm tra số buổi tính tiền cập nhật.

## Ghi chú

V19D chỉ tách render `tuitionPage()`. Toàn bộ mutation/API học phí vẫn nằm trong app core để tránh rủi ro sai trạng thái thanh toán.
