# V18D Partial Render App Shell

Mục tiêu: giữ nguyên UI/UX nhưng giảm việc dựng lại toàn bộ app shell.

## Đã tối ưu

1. Giữ lại app shell khi đổi tab hoặc render lại nội dung
   - Sidebar không bị dựng lại nếu user/role/nav không đổi.
   - Topbar không bị dựng lại nếu user/role/nav không đổi.
   - Bottom nav không bị dựng lại nếu user/role/nav không đổi.
   - Chỉ cập nhật `.page` nội dung chính.

2. Active nav được cập nhật riêng
   - Nút sidebar/bottom nav vẫn đổi trạng thái active đúng route.
   - Không cần render lại toàn bộ layout.

3. Có fallback an toàn
   - Nếu shell chưa tồn tại hoặc quyền/nav thay đổi, render full app như cũ.
   - Khi login/logout/đổi mật khẩu, reset shell key để tránh dùng shell cũ.

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
2. Chuyển qua lại các tab: Tổng quan, Lịch dạy, Điểm danh, Học phí.
3. Kiểm tra sidebar/topbar không bị nháy mạnh.
4. Kiểm tra nút active sidebar/bottom nav đổi đúng.
5. Mở popup điểm danh và lưu.
6. Logout rồi login lại tài khoản khác.
7. Kiểm tra phân quyền nav vẫn đúng.
