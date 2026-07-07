# V20B.18 — Teacher schedule freshness fix

## Mục tiêu

Kiểm tra và siết lại phần lấy dữ liệu lịch học mới nhất cho tài khoản giáo viên.

## Lỗi/rủi ro đã tìm thấy

### 1. Lịch dạy refresh schedule/state nhưng không luôn refresh /api/classes

Nếu Admin/Quản lí vừa thêm lớp, gỡ lớp, đổi giáo viên hoặc xóa lớp, tài khoản giáo viên có thể vẫn dùng core classes cũ trong cache.

### 2. Dạy bù đã hủy có thể bị giữ lại ở local

Trước đó frontend merge `classMakeupSessions` mới với local cũ. Nếu server không trả một lịch dạy bù vì đã hủy/gỡ giáo viên, local vẫn có thể giữ lại.

### 3. Lớp đã kết thúc/hủy vẫn có nguy cơ render trên lịch nếu còn trong local

Lịch cần lọc theo trạng thái active.

## Đã sửa

- Khi mở tab Lịch dạy / Điểm danh / Học bù, app render cache trước rồi refresh nền cả:
  - `/api/classes`
  - `/api/schedule/state`
  - `/api/attendance/state` nếu cần
- Khi đổi tuần, app cũng refresh lại core classes.
- `classMakeupSessions` từ schedule/state được replace theo server, không merge với local cũ.
- Lịch chỉ render regular class còn active.
- API `/api/classes` cho tài khoản giáo viên chỉ trả class active hoặc status null.

## Kết quả mong muốn

- Lớp mới được gán cho giáo viên sẽ hiện sau khi mở Lịch dạy.
- Lớp bị gỡ/xóa/kết thúc sẽ biến mất khỏi Lịch dạy.
- Buổi nghỉ vẫn hiện đúng.
- Dạy bù được gán cho giáo viên vẫn hiện đúng.
- Dạy bù đã hủy hoặc đổi sang giáo viên khác sẽ biến mất.
- UI vẫn cache-first nên không bị trắng trang khi refresh nền.

## Không thay đổi

- Không cần SQL mới.
- Không đổi UI.
- Không đổi quyền tài khoản.
- Không đổi workflow xếp học bù/dạy bù.
