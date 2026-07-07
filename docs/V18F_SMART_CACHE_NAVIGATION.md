# V18F Smart Cache Navigation

Mục tiêu: giữ nguyên UI/UX nhưng làm chuyển tuần/tháng và reload module mượt hơn.

## Đã tối ưu

1. Chuyển tuần lịch/điểm danh cache-first
   - Không xóa cache tuần đã từng xem.
   - Khi đổi tuần, nếu có cache thì hiển thị ngay trước.
   - Sau đó vẫn refresh dữ liệu thật ở nền để đảm bảo đúng.

2. Chuyển tháng học phí/đánh giá cache-first
   - Không xóa cache tháng đã từng xem.
   - Quay lại tháng cũ hiển thị nhanh hơn.
   - Vẫn refresh API thật sau đó.

3. Cập nhật cache sau thao tác quan trọng
   - Lưu điểm danh cập nhật cache điểm danh.
   - Đánh dấu đã nộp/bỏ nộp/gửi học phí cập nhật cache học phí.
   - Upload/xóa thư viện cập nhật cache thư viện.
   - Lưu/chốt đánh giá cập nhật cache đánh giá.
   - Cho nghỉ/mở lại buổi học cập nhật cache lịch.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi SQL.
- Không đổi database.
- Không đổi logic học phí.
- Không đổi logic điểm danh/học bù.
- Không đổi luồng login chính.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Mở Lịch dạy, chuyển tuần trước/sau, quay lại tuần cũ.
2. Mở Điểm danh, chuyển tuần và quay lại.
3. Mở Học phí, đổi tháng, quay lại tháng đã xem.
4. Đánh dấu đã nộp, reload trang, kiểm tra trạng thái vẫn đúng.
5. Mở Thư viện, upload/xóa tài liệu, reload.
6. Mở Đánh giá, lưu nháp/chốt, đổi tháng rồi quay lại.
