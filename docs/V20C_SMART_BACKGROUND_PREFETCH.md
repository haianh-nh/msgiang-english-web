# V20C — Smart Background Prefetch

## Mục tiêu

Tối ưu cảm giác chuyển tab trong app nhưng không đổi logic nghiệp vụ.

## Cách hoạt động

Sau khi trang hiện tại tải xong, app đợi một khoảng ngắn rồi tải nền 1–2 trang có khả năng người dùng mở tiếp.

Ví dụ:

- Tổng quan → Lịch dạy / Điểm danh
- Lớp học → Lịch dạy
- Lịch dạy → Điểm danh / Học phí tùy vai trò
- Điểm danh → Học phí hoặc Lịch dạy
- Thư viện → Đánh giá

## Nguyên tắc an toàn

- Trang hiện tại luôn được ưu tiên tải trước.
- Prefetch chỉ chạy khi app rảnh.
- Prefetch không đổi route.
- Prefetch không tự render lại trang hiện tại.
- Prefetch không chạy khi đang mở popup.
- Prefetch bỏ qua route đã tải gần đây trong vòng 60 giây.
- Mỗi lượt chỉ tải tối đa 2 route liên quan.
- Không gọi force reload cho toàn app.

## Không thay đổi

- Không đổi API.
- Không đổi database.
- Không đổi UI.
- Không đổi logic lịch học.
- Không đổi logic học bù/dạy bù/điểm danh.
- Không cần SQL mới.

## Lợi ích kỳ vọng

- Chuyển từ Lớp học sang Lịch dạy nhanh hơn.
- Chuyển từ Lịch dạy sang Điểm danh nhanh hơn.
- Admin/Quản lí mở Học phí sau Điểm danh mượt hơn.
- Giáo viên mở các trang thường dùng liền kề ít bị màn hình tải hơn.
