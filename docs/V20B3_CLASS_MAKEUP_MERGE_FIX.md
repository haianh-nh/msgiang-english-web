# V20B.3 — Class makeup merge fix

## Vấn đề

Sau V20B.2, thao tác xếp dạy bù đã đúng nhưng sau refresh vẫn có thể mất lịch dạy bù.

## Nguyên nhân

Sau refresh, app hydrate dữ liệu từ cache rồi gọi API `/api/schedule/state` để refresh nền.
Nếu API trả thiếu `classMakeupSessions` trong một thời điểm nào đó, dữ liệu local/cache vừa có sẽ bị ghi đè bằng danh sách rỗng.

## Đã sửa

1. Thêm `v20bMergeClassMakeupSessions(existing, incoming)`.
2. Khi hydrate cache hoặc refresh API, app **merge** lịch dạy bù thay vì thay thế toàn bộ.
3. Khi lưu lịch dạy bù, app cũng merge theo `sourceSessionKey` để tránh trùng/mất dữ liệu.
4. Cache-bust `index-v15.html` bằng query `?v=20b3` cho:
   - `/v15/app.js`
   - `/v15/modules/*.js`

## Vì sao cache-bust quan trọng?

`/v15/*` đang được cache immutable trong production. Nếu không đổi URL script, trình duyệt có thể vẫn chạy app.js hoặc schedule.js cũ dù Vercel đã deploy code mới.

## Không thay đổi

- Không đổi SQL/database.
- Không đổi UI/UX.
- Không đổi luồng xếp dạy bù.
