# V20B.4 — Login state reset fix

## Vấn đề

Phần dạy bù đã đúng khi thao tác và refresh trang. Nhưng nếu logout rồi đăng nhập lại trong cùng tab, dữ liệu dạy bù/lịch có thể mất tạm thời. Refresh trình duyệt thì dữ liệu mới hiện lại.

## Nguyên nhân

Khi logout/login trong cùng phiên JavaScript:

1. `clearVolatileOfficialState()` làm rỗng dữ liệu module như schedule, attendance, tuition.
2. Nhưng `lazyRouteState.schedule`, `lazyRouteState.attendance`, `lazyRouteState.tuition` vẫn có thể còn trạng thái `loaded=true` từ lần đăng nhập trước.
3. Khi vào lại Lịch dạy, app nghĩ module schedule đã loaded nên không gọi API `/api/schedule/state` ngay.
4. Refresh trình duyệt reset toàn bộ state JS nên dữ liệu lại tải đúng.

## Đã sửa

1. Thêm `v20b4ResetRouteLoadState()`:
   - xóa toàn bộ trạng thái loaded/loading/error của module.
2. Thêm `v20b4ResetSessionMemo()`:
   - xóa memo cũ của bảng, lịch tuần, điểm danh, roster, index.
3. Khi login:
   - reset toàn bộ lazy route state,
   - reset memo,
   - clear network GET cache,
   - rồi mới clear volatile data và load core.
4. Khi logout:
   - reset lazy route state,
   - reset memo,
   - clear network GET cache,
   - clear dữ liệu volatile.
5. Cache-bust `index-v15.html` sang `?v=20b4`.

## Không thay đổi

- Không đổi SQL.
- Không đổi UI/UX.
- Không đổi API.
- Không đổi logic dạy bù.
