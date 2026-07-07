# V20E — Local Cache & Save Optimization

## Mục tiêu

Giảm số lần ghi `localStorage` và giảm JSON stringify/parse lặp lại, giúp app nhẹ hơn sau các bản prefetch/skeleton.

## Đã tối ưu

### 1. Ghi local data có debounce

`msgiang_v48_data` không còn ghi liên tục ngay mỗi lần `saveLocalOnly()`.

- Các thay đổi local được gom lại.
- Sau khoảng ngắn mới ghi.
- Nếu snapshot không đổi thì bỏ qua.

### 2. Chống ghi trùng

Nếu dữ liệu compact giống lần ghi trước, app không ghi lại `localStorage`.

### 3. Flush an toàn khi rời tab

Khi tab bị ẩn, reload hoặc đóng trang, app flush các cache đang chờ ghi.

### 4. Module cache dùng memory store

Module cache không đọc/ghi JSON localStorage liên tục ở mỗi lần `moduleCacheSet()`.

- Đọc cache dùng memory store trong phiên hiện tại.
- Ghi cache được batch.
- Vẫn flush khi pagehide/beforeunload.

### 5. Route save chống ghi trùng

`msgiang_v48_route` chỉ ghi khi route thật sự đổi.

## Không thay đổi

- Không đổi API.
- Không đổi database.
- Không đổi UI.
- Không đổi logic lịch học/học bù/dạy bù/điểm danh/học phí.
- Không cần SQL mới.

## Lợi ích kỳ vọng

- Giảm lag nhỏ khi background refresh/prefetch.
- Giảm số lần ghi localStorage trên iPhone/iPad.
- Chuyển tab và lưu trạng thái UI nhẹ hơn.
