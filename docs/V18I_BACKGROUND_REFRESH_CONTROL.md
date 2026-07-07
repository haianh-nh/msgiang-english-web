# V18I Background Refresh Control

Mục tiêu: giữ nguyên UI/UX nhưng giảm render lại khi refresh nền không có dữ liệu mới.

## Đã tối ưu

1. Refresh API có kiểm tra thay đổi
   - Mỗi payload từ API được hash ổn định.
   - Nếu dữ liệu giống lần trước, app không `v18Touch()` và không render lại.

2. Giảm nháy UI sau cache-first
   - V18F hiển thị cache trước rồi refresh API thật.
   - V18I chỉ render lại sau refresh nếu API trả về dữ liệu khác cache/dữ liệu hiện tại.

3. Refresh route thông minh hơn
   - Lần đầu mở module vẫn render để thoát màn loading.
   - Các lần refresh nền sau đó không render nếu dữ liệu không đổi.
   - Nếu người dùng đã rời tab, refresh xong không ép render tab cũ.

4. Áp dụng cho module
   - Lớp học
   - Giáo viên
   - Lịch dạy
   - Điểm danh
   - Học phí
   - Thư viện
   - Đánh giá

## Không thay đổi

- Không đổi UI/UX.
- Không đổi SQL.
- Không đổi database.
- Không đổi logic học phí.
- Không đổi logic điểm danh/học bù.
- Không đổi luồng login chính.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Mở Lịch dạy, đổi tuần rồi quay lại tuần đã xem.
2. Quan sát nếu dữ liệu không đổi thì UI không nháy thêm.
3. Mở Học phí, đổi tháng rồi quay lại.
4. Mở Thư viện, bấm tải lại nhiều lần.
5. Lưu điểm danh hoặc đánh dấu học phí để đảm bảo dữ liệu vẫn cập nhật khi thật sự thay đổi.
