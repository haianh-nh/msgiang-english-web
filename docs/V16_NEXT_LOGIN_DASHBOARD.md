# V16 Next Login + Dashboard

Mục tiêu: bắt đầu tách app khỏi nền HTML demo một cách an toàn.

## Thay đổi

1. Root `/` chuyển sang `/dashboard`.
2. Thêm trang Next.js thật:
   - `/login`
   - `/dashboard`
3. Trang login gọi API hiện tại:
   - `POST /api/auth/login`
   - `GET /api/auth/me`
4. Dashboard đọc session bằng `currentUser()` và tải dữ liệu tổng quan nhẹ.
5. App V15 vẫn giữ nguyên tại:
   - `/index-v15.html`
   - `/app`
   - `/legacy`
6. Các nút trên dashboard ghi `msgiang_v48_route` rồi mở app V15 đúng tab.

## Không thay đổi

- Không đổi SQL.
- Không đổi Supabase schema.
- Không đổi API login/session.
- Không đổi logic học phí, điểm danh, học bù, thư viện, đánh giá.
- Không đổi UI/UX chính của các module cũ.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Mở `/`.
2. Nếu chưa đăng nhập, phải chuyển `/login`.
3. Login Admin.
4. Sau login vào `/dashboard`.
5. Bấm các nút Lớp học/Lịch dạy/Học phí để mở app V15 đúng tab.
6. Logout rồi login giáo viên.
7. Giáo viên không thấy nút học phí và app cũ vẫn chỉ hiện lớp được phân quyền.
