# Phase 7F — Tối ưu phản hồi Học phí và Đánh giá học sinh

Build: `20phase7f-tuition-evaluation-fast-ui`

## Học phí

- Khi cập nhật một học sinh, giao diện chỉ thay đúng hàng học sinh, thống kê tổng và thống kê lớp liên quan.
- Không gọi render lại toàn bộ ứng dụng sau các thao tác đơn lẻ:
  - Đã nộp / bỏ trạng thái đã nộp.
  - Đã gửi.
  - Học liệu.
  - Khoản điều chỉnh.
- Giữ nguyên sidebar, vị trí cuộn, bộ lọc và trạng thái lớp đang mở.
- Lớp đang thu gọn không tạo HTML cho các hàng học sinh.
- Chỉ dựng bảng học sinh khi người dùng mở lớp.
- Tải kiểm tra dữ liệu ở nền được gộp bằng timer để tránh nhiều lần refresh chồng nhau.
- Các thao tác hàng loạt vẫn giữ nguyên logic hiện tại nhưng chỉ dựng lại khu vực Học phí, không dựng lại toàn bộ ứng dụng.

## Đánh giá học sinh

- Danh sách lớp chuyển sang dạng mở/thu gọn; mặc định chỉ mở một lớp.
- Chỉ lớp đang mở mới tạo các hàng học sinh.
- Chấm điểm 1–5 chỉ cập nhật state trong bộ nhớ và đúng nội dung popup.
- Không gọi `save()` toàn bộ dữ liệu ứng dụng sau mỗi lần bấm điểm.
- Bản nháp cục bộ được ghi bằng debounce khoảng 750 ms sau khi người dùng ngừng thao tác.
- API chỉ được gọi khi bấm **Lưu nháp** hoặc **Gửi đánh giá**.
- Sau khi lưu/gửi, chỉ cập nhật đúng thẻ học sinh, badge trạng thái, số liệu lớp và nội dung popup.
- Không đóng rồi mở lại popup và không dựng lại toàn bộ trang.
- Loading và chống bấm lặp được áp dụng riêng cho từng học sinh/nút.
- Khi đóng popup có thay đổi chưa lưu lên server, hệ thống cảnh báo; bản nháp cục bộ vẫn được giữ lại.
- Hủy chỉnh sửa khôi phục dữ liệu trước khi mở popup.
- Không tạo bản ghi đánh giá trống chỉ vì người dùng mở trang.

## Phạm vi an toàn

- Không thay đổi công thức tính học phí.
- Không thay đổi trạng thái thanh toán, quy trình gửi hoặc cấu trúc hóa đơn.
- Không thay đổi API học phí hiện có.
- Không thay đổi schema Supabase và không cần migration SQL.
- Không thay đổi quyền truy cập: Lễ tân tiếp tục không nhìn thấy hoặc truy cập dữ liệu Học phí.

## Kiểm tra đã chạy

- Kiểm tra cú pháp `public/v15/app.js`.
- Kiểm tra cú pháp module Học phí và Đánh giá.
- Production build Next.js và TypeScript thành công.
- `/api/version` và response header cùng trả build `20phase7f-tuition-evaluation-fast-ui`.
- Browser smoke test với dữ liệu mẫu:
  - Mở/thu gọn lớp Học phí không dựng lại toàn trang.
  - Đánh dấu đã nộp cập nhật đúng hàng và bộ lọc.
  - Mở/thu gọn lớp Đánh giá không dựng lại toàn trang.
  - Chấm điểm, lưu nháp và gửi chỉ cập nhật đúng popup/thẻ học sinh.
  - Hủy chỉnh sửa và cảnh báo bản nháp hoạt động đúng.
