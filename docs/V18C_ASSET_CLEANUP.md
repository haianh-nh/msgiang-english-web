# V18C Asset Cleanup

Mục tiêu: giảm dung lượng app chính mà không đổi UI/UX hoặc logic.

## Đã tối ưu

- Tách image base64 nhúng trong `public/v15/app.js` ra file tĩnh:
  - `public/v15/assets/asset-aa296a04fdb9.png` (128,869 bytes)

## Kết quả

- Trước: `app.js` khoảng 836,940 bytes.
- Sau: `app.js` khoảng 493,315 bytes.
- Giảm khoảng 343,625 bytes.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi SQL.
- Không đổi database.
- Không đổi logic học phí.
- Không đổi logic điểm danh/học bù.
- Không đổi luồng login chính.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Mở app chính.
2. Kiểm tra logo/login/sidebar vẫn hiện bình thường.
3. Login Admin.
4. Mở lớp học/lịch/điểm danh/học phí/đánh giá.
5. Reload trang, kiểm tra không bị mất ảnh hoặc lỗi console.
