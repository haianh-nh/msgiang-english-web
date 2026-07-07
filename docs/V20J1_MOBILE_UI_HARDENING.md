# V20J.1 — Mobile UI hardening

## Mục tiêu

Kiểm tra lại kỹ UI trên điện thoại/iPad và vá các lỗi dễ gặp sau V20I/J.

## Phạm vi

Bản này chỉ sửa CSS hiển thị. Không đổi logic nghiệp vụ.

## Các lỗi mobile đã xử lý

### 1. Tràn ngang màn hình

Ép các container chính:

- `app`
- `main`
- `content`
- `page`

không vượt quá chiều rộng màn hình.

Bảng dài vẫn được phép cuộn ngang trong `tableWrap/modalTableWrap`.

### 2. Bottom navigation quá nhiều nút

Trước đó bottom nav có thể bị thành nhiều dòng khi Admin/Manager có nhiều mục.

Bản này đổi bottom nav trên mobile thành thanh cuộn ngang:

- không che quá nhiều màn hình,
- không ép nút quá nhỏ,
- vẫn truy cập được đủ mục.

### 3. Popup/modal trên điện thoại

- Modal bám trên đầu màn hình thay vì bị căn giữa gây khó thao tác.
- Modal có `max-height` theo `100dvh`.
- Thêm safe-area cho iPhone.
- Header popup và nút đóng ổn định hơn.
- Các nút thao tác trong popup xếp dọc, dễ bấm.

### 4. Form và nút trên màn hình nhỏ

- Form chuyển về 1 cột.
- Nút có chiều cao tối thiểu dễ bấm.
- Input dùng font-size 16px để tránh iOS tự zoom khi focus.

### 5. Trang đánh giá học sinh

- Student row về 1 cột.
- Cụm nút Gửi/Tạo ảnh/Đánh giá không chen nhau.
- Biểu đồ kỹ năng cuộn ngang trong vùng riêng.

### 6. Bảng dài

- Bảng học phí/điểm danh/danh sách học sinh cuộn ngang trong khung.
- Không kéo tràn toàn bộ page.

## Không thay đổi

- Không đổi database.
- Không đổi API.
- Không đổi logic lớp/lịch/điểm danh/học phí/đánh giá.
- Không thêm bảng/log.
