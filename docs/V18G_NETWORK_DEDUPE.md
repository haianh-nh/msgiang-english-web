# V18G Network Request De-duplication

Mục tiêu: giữ nguyên UI/UX nhưng giảm request API trùng lặp trong thời gian ngắn.

## Đã tối ưu

1. De-duplicate GET request đang chạy
   - Nếu cùng một GET API đang được gọi, request sau sẽ dùng chung promise.
   - Tránh gọi trùng `/api/schedule/state`, `/api/attendance/state`, `/api/tuition/state`, `/api/library`, `/api/evaluations`, `/api/teachers`.

2. Short GET cache
   - GET API cùng URL trong khoảng rất ngắn sẽ dùng lại response.
   - TTL ngắn 1.8 giây để tránh dữ liệu cũ lâu.
   - Sau các mutation POST/DELETE, cache GET ngắn sẽ được clear.

3. Không áp dụng cho mutation
   - POST/DELETE/upload không bị cache.
   - FormData upload vẫn giữ nguyên.

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
2. Chuyển nhanh giữa Lịch dạy và Điểm danh.
3. Mở Học phí, đổi tháng rồi quay lại.
4. Mở Thư viện, tải lại thư viện.
5. Upload tài liệu thử nếu cần.
6. Lưu điểm danh, đánh dấu học phí đã nộp.
7. Kiểm tra dữ liệu sau thao tác vẫn cập nhật đúng.
