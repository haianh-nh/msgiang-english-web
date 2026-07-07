# V20L.4 — Schedule absence count live update

## Vấn đề

Trong Lịch dạy, thẻ buổi học chỉ hiện số học sinh vắng khi buổi đã chuyển sang trạng thái `Đã dạy`.
Nếu Admin/Quản lí điểm danh sớm hoặc điểm danh trong lúc buổi vẫn `Chưa dạy/Đang dạy`, lịch vẫn chưa hiện `Vắng: x`.

Ngoài ra route `schedule` trước đó chỉ tải `/api/schedule/state`, chưa tải `/api/attendance/state`, nên khi mở Lịch dạy từ cache có thể không có dữ liệu vắng.

## Đã sửa

- `Lịch dạy` giờ cũng tải dữ liệu attendance/absence từ `/api/attendance/state`.
- `absentCountForSession()` không còn bị khóa bởi trạng thái `Đã dạy`.
- Nếu buổi đã lưu điểm danh, thẻ lịch hiện ngay `Vắng: x` kể cả khi buổi vẫn `Chưa dạy/Đang dạy`.
- Sau khi bấm `Lưu điểm danh`, schedule cache/memo được invalidate và page Lịch dạy được render lại phía sau popup.
- Khi đóng popup điểm danh, số học sinh vắng đã hiển thị luôn trên thẻ lịch.

## Không đổi

- Không đổi database.
- Không cần SQL.
- Không đổi logic học bù tự do V20L.
- Không đổi quyền điểm danh Admin/Quản lí/Teacher từ V20L.2.
