# V18J Production Cleanup

Mục tiêu: giữ nguyên UI/UX nhưng dọn các thành phần production không còn dùng trước khi sang giai đoạn V19.

## Đã dọn

1. Dashboard shell cũ
   - `/dashboard` không còn dựng UI trung gian V16.
   - `/dashboard` redirect thẳng về `/index-v15.html`.
   - App chính vẫn dùng màn login nội bộ hiện tại.

2. Component shell V16 không còn dùng
   - Xóa `components/V16LegacyOpenButton.tsx`.
   - Xóa `components/V16LoginForm.tsx`.
   - Xóa `components/V16LogoutButton.tsx`.

3. File reference nặng không dùng trong production
   - Xóa `public/v48-reference.html`.
   - File này chỉ là bản tham chiếu cũ và không nằm trong luồng chạy chính.

## Kết quả dọn file

- `components/V16LegacyOpenButton.tsx`: 488 bytes
- `components/V16LoginForm.tsx`: 2,997 bytes
- `components/V16LogoutButton.tsx`: 696 bytes
- `public/v48-reference.html`: 936,005 bytes

## Không thay đổi

- Không đổi UI/UX app chính.
- Không đổi SQL.
- Không đổi database.
- Không đổi logic học phí.
- Không đổi logic điểm danh/học bù.
- Không đổi luồng login chính của app.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Mở `/`.
2. Mở `/login`.
3. Mở `/dashboard`.
4. Cả 3 đường dẫn đều phải vào app chính `/index-v15.html`.
5. Login Admin.
6. Kiểm tra các module: Lớp học, Lịch dạy, Điểm danh, Học phí, Thư viện, Đánh giá.
