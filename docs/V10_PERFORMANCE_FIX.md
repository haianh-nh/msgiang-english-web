# V10 Performance Fix

Mục tiêu: tăng tốc phản hồi sau login và khi mở lại web.

## Nguyên nhân chậm

Bản cũ sau login/bootstrap chờ nhiều API chạy tuần tự:
- classes
- teachers
- schedule
- attendance
- tuition
- library
- evaluations

Mỗi API lại gọi `save()` làm localStorage stringify và queue lưu snapshot.

## Sửa đổi

1. Login/bootstrap tải dữ liệu quan trọng trước:
   - Xóa volatile demo state
   - Tải `/api/classes`
   - Render giao diện ngay

2. Các dữ liệu nặng tải nền:
   - teachers
   - schedule
   - attendance
   - tuition
   - library
   - evaluations

3. Các refresh phụ chạy song song bằng `Promise.allSettled()` thay vì chạy lần lượt.

4. Trong lúc bulk refresh, tắt save lặp lại nhiều lần, chỉ lưu local một lần ở cuối.

Không cần SQL mới.
