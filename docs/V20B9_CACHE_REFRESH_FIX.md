# V20B.9 — Cache refresh fix for assigned class makeup

## Vấn đề

Admin đã xếp dạy bù và database lưu đúng `teacher_id`, nhưng khi giáo viên được gán đăng nhập vào Lịch dạy vẫn không thấy buổi dạy bù.

## Nguyên nhân

Dữ liệu của giáo viên có cache riêng theo user. Trước khi Admin gán dạy bù, tài khoản giáo viên có thể đã từng mở Lịch dạy và cache schedule khi đó đang rỗng.

Sau đó:
1. Admin gán dạy bù cho giáo viên.
2. Giáo viên đăng nhập/mở Lịch dạy.
3. App hydrate cache schedule cũ của giáo viên để render nhanh.
4. Nhưng `ensureRouteData()` dừng lại ở cache và không gọi API refresh nền.
5. Kết quả: giáo viên thấy "Chưa có dữ liệu lịch học" dù server/database đã có dữ liệu.

## Đã sửa

`ensureRouteData()` giờ xử lý cache đúng kiểu cache-first:

1. Nếu hydrate được cache, render nhanh.
2. Sau đó vẫn bắt buộc gọi API refresh nền với `force:true`.
3. Khi API trả dữ liệu mới, app apply vào local state và render lại.
4. Cache sau API được đánh dấu `fromCache:false`.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi SQL/database.
- Không đổi API.
- Không đổi logic xếp dạy bù.
