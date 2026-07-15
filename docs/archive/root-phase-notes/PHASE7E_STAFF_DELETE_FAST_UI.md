# Phase 7E — Xóa Lễ tân và tối ưu phản hồi nhân sự

Build: `20phase7e-staff-delete-fast-ui`

## Chức năng mới

- Admin có thể xóa tài khoản Lễ tân tại:
  - Trang **Giáo viên & nhân sự** → mở thẻ Lễ tân → **Xóa Lễ tân**.
  - Trang **Cài đặt & tài khoản** → hàng Lễ tân → **Xóa**.
- Server chỉ cho phép Admin gọi `DELETE /api/users`.
- API chỉ xóa tài khoản có role `receptionist`.
- Xóa toàn bộ phiên đăng nhập của Lễ tân trước khi xóa tài khoản `official_users`.
- Từ chối xóa nếu dữ liệu cũ vô tình liên kết tài khoản Lễ tân với hồ sơ `official_teachers`.

## Tối ưu giao diện nhân sự

- Tạo, sửa và xóa Giáo viên/Lễ tân không gọi render lại toàn bộ trang Giáo viên.
- Chỉ cập nhật đúng thẻ nhân sự vừa thao tác.
- Chỉ cập nhật các bộ đếm: Giáo viên, Quản lí, Lễ tân, TA và Admin.
- Giữ nguyên sidebar, vị trí cuộn và các thẻ nhân sự khác.
- Thẻ sau khi đổi tên được tự đưa về đúng vị trí sắp xếp.
- Cache module nhân sự được cập nhật ngay và kiểm tra lại với server ở nền.

## Phản hồi nút và popup

- Loading riêng cho từng thao tác: tạo, lưu, reset, xóa, gán lớp và bỏ gán.
- Nút đang chạy bị khóa để ngăn gửi request lặp.
- Các nút/thẻ khác vẫn hoạt động bình thường.
- Popup đóng ngay sau khi lưu/xóa thành công.
- Reset mật khẩu không làm render lại trang.

## Database

Không có migration SQL mới. Dùng schema role Lễ tân đã triển khai ở Phase 7C/7D.

## Kiểm tra đã chạy

- `node --check public/v15/app.js`
- `npx tsc --noEmit`
- `npm run build`
- Kiểm tra production header và `/api/version` cùng trả build `20phase7e-staff-delete-fast-ui`.
