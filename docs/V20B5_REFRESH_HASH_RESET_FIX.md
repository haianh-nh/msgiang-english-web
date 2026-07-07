# V20B.5 — Refresh hash reset fix

## Vấn đề

Sau khi logout rồi login lại trong cùng tab, dashboard và thẻ Lớp học hiện 0 lớp / 0 học sinh. Refresh trình duyệt thì dữ liệu mới hiện.

## Nguyên nhân chính

Ngoài `lazyRouteState`, app còn có `v18iRefreshHashes` dùng để so sánh payload API xem dữ liệu có thay đổi không.

Khi logout/login trong cùng phiên JS:

1. `clearVolatileOfficialState()` làm rỗng `db.classes`.
2. `v18iRefreshHashes['classes:latest']` vẫn còn hash của payload lớp cũ.
3. Login lại gọi `/api/classes`, server trả đúng dữ liệu.
4. Nhưng hash payload giống lần trước, nên app kết luận `changed=false`.
5. Vì `changed=false`, app không gán lại `db.classes`.
6. Kết quả dashboard và lớp học = 0 cho đến khi refresh trình duyệt, vì refresh reset toàn bộ JS memory.

## Đã sửa

1. `v20b4ResetRouteLoadState()` giờ reset thêm toàn bộ `v18iRefreshHashes`.
2. `refreshOfficialClasses()` giờ vẫn apply payload nếu local classes/teachers đang rỗng nhưng server trả dữ liệu.
3. `refreshOfficialScheduleState()` cũng apply payload nếu local schedule/classMakeup đang rỗng nhưng server trả dữ liệu.
4. Cache-bust JS sang `?v=20b5`.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi SQL/database.
- Không đổi quyền tài khoản.
- Không đổi logic xếp dạy bù.
