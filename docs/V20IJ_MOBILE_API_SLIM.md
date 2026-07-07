# V20I/J — Mobile/iPad fine tune + API payload slimming

## Mục tiêu

Chỉ tối ưu những phần nhẹ và an toàn:

- giảm payload lịch dạy,
- cải thiện thao tác trên điện thoại/iPad,
- không thêm bảng database,
- không đổi logic nghiệp vụ.

## V20I — API Payload Slimming

### Đã làm

`/api/schedule/state` trước đây lấy toàn bộ `official_class_makeup_sessions` chưa hủy, rồi frontend chỉ dùng phần lịch trong tuần.

Bản này đổi thành:

```text
Nếu request có start/end
→ chỉ lấy class makeup trong tuần đang xem
```

Lợi ích:

- giáo viên/admin mở lịch nhanh hơn khi dữ liệu dạy bù tích lũy nhiều,
- giảm payload trả về,
- giảm số class snapshot/student snapshot phải dựng cho lịch dạy bù.

### Không đổi

- Không lọc student makeup plan vì phần học bù có thể cần dữ liệu chờ xử lý nhiều tuần.
- Không đổi logic xếp/hủy dạy bù.
- Không đổi dữ liệu DB.

## V20J — Mobile/iPad fine tune

### Đã làm

- Modal có `max-height` và scroll tốt hơn trên iPhone/iPad.
- Bảng dài cuộn ngang mượt hơn với `-webkit-overflow-scrolling`.
- Header bảng sticky trong vùng cuộn.
- Nút bấm tối thiểu ~44px, dễ bấm hơn trên cảm ứng.
- Form trong modal tự chuyển về 1 cột trên màn hình nhỏ.
- Trang đánh giá học sinh trên điện thoại dễ đọc hơn.
- Các cụm nút trong popup/lớp/đánh giá không bị chen nhau.
- Bottom navigation có safe-area cho iPhone.

## Không thay đổi

- Không thêm database table.
- Không cần SQL.
- Không đổi API behavior chính.
- Không đổi logic lớp/lịch/điểm danh/học phí/đánh giá.
