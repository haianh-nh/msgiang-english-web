# V18H Local State Cleanup

Mục tiêu: giữ nguyên UI/UX nhưng giảm dữ liệu nặng lưu trong browser.

## Đã tối ưu

1. Compact localStorage `msgiang_v48_data`
   - Trước đây localStorage có thể lưu gần như toàn bộ `db`.
   - V18H chỉ lưu state nhẹ: settings, tuần/tháng đang xem, filter học phí/đánh giá/thư viện, scope của quản lí.
   - Dữ liệu thật như lớp, điểm danh, học phí, thư viện, đánh giá vẫn lấy từ API và module cache.

2. Dọn module cache
   - Giới hạn module cache còn 18 key mới nhất thay vì nhiều hơn.
   - Tự bỏ cache quá hạn theo TTL.
   - Không giữ module cache cũ rỗng/quá cũ.

3. Dọn legacy storage
   - Xóa cache cũ của các bản trước V15 nếu còn sót.
   - Nếu phát hiện snapshot local cũ quá lớn, tự compact lại.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi SQL.
- Không đổi database.
- Không đổi logic học phí.
- Không đổi logic điểm danh/học bù.
- Không đổi luồng login chính.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Login vào app chính.
2. Mở Lớp học, Lịch dạy, Điểm danh, Học phí.
3. Đổi tuần/tháng/filter.
4. Reload trang.
5. Kiểm tra tuần/tháng/filter vẫn giữ.
6. Kiểm tra dữ liệu lớp/điểm danh/học phí vẫn tải đúng từ backend.
