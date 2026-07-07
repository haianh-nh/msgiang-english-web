# V20B.13 — Schedule load optimization

## Mục tiêu

Ổn định và tối ưu lại phần Lịch dạy sau khi đã fix dạy bù cả lớp + giáo viên được gán dạy bù.

## Vấn đề trước đó

V20B.11/V20B.12 ưu tiên an toàn dữ liệu nên khi vào Lịch dạy app gọi nhiều luồng:

1. `/api/schedule/state`
2. `/api/schedule/class-makeup/visible`
3. refresh lại `/api/classes` nếu visible makeup thay đổi
4. merge classSnapshot / classMakeupSessions

Dữ liệu đúng nhưng cảm giác vào Lịch dạy bị chậm.

## Đã tối ưu

### 1. Single source cho Lịch dạy

`/api/schedule/state` là nguồn chính cho:

- buổi nghỉ,
- dạy bù cả lớp,
- dạy bù được gán cho giáo viên,
- học bù học sinh.

Frontend không còn gọi thêm `/api/schedule/class-makeup/visible` khi vào Lịch dạy.

### 2. Không force reload mỗi lần bấm tab Lịch dạy

Bấm tab Lịch dạy bình thường:

- dùng cache tuần hiện tại trước nếu có,
- render nhanh,
- refresh nền nếu cache cũ hoặc dữ liệu quá hạn.

### 3. Chỉ invalidate mạnh sau mutation

App chỉ reset schedule cache khi có thao tác ảnh hưởng lịch, ví dụ:

- cho nghỉ buổi học,
- mở lại buổi học,
- xếp/đổi dạy bù,
- tạo lớp mới có lịch học.

### 4. Stale refresh nhẹ

Nếu dữ liệu schedule đã loaded quá 20 giây, app refresh nền khi quay lại Lịch dạy, nhưng không chặn UI.

### 5. Giữ safe merge

Vẫn giữ logic V20B.12:

- không để classSnapshot ghi đè `time` của lớp thật,
- không làm mất lịch học thường,
- vẫn hiển thị dạy bù cho giáo viên được gán.

## Không thay đổi

- Không cần SQL mới.
- Không đổi UI/UX.
- Không đổi workflow dạy bù.
- Không đổi quyền tài khoản.
