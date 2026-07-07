# V20B.14 — Schedule state schema fix

## Vấn đề

Khi vào Lịch dạy, console báo lỗi 500:

`column official_session_cancellations.id does not exist`

Lỗi phát sinh tại API:

`/api/schedule/state`

## Nguyên nhân

Bảng `official_session_cancellations` ở database production không có cột `id`.
Trong V20B.13, API đang select `id, session_key, class_id, ...`, nên Supabase trả lỗi 500 và frontend không tải được dữ liệu lịch/học bù.

## Đã sửa

Trong `app/api/schedule/state/route.ts`, bỏ `id` khỏi select của bảng `official_session_cancellations`.

API dùng `session_key` làm khóa của buổi nghỉ.

## Không thay đổi

- Không cần SQL mới.
- Không đổi UI.
- Không đổi logic dạy bù.
- Không đổi database.
