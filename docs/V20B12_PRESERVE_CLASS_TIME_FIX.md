# V20B.12 — Preserve class time fix

## Vấn đề

Sau khi sửa để giáo viên được gán dạy bù nhìn thấy buổi dạy bù, lịch ở Admin bị mất các lớp thường. Nguyên nhân là snapshot lớp dùng cho buổi dạy bù không có `time`, nhưng khi merge vào `db.classes` lại ghi đè dữ liệu lớp chính.

Khi `time` bị rỗng, `parseClassSessions()` không dựng được các buổi học thường, nên lịch các lớp khác biến mất.

## Đã sửa

1. Thêm `v20b12SafeClassSnapshotMerge()`
   - Không ghi đè `time` hiện có bằng chuỗi rỗng.
   - Không ghi đè các field chính bằng dữ liệu rỗng từ snapshot.
   - Chỉ cập nhật students nếu snapshot có danh sách students.

2. `refreshOfficialClasses()` tự sửa lại nếu local class bị mất `time` nhưng server `/api/classes` có `time`.

3. Khi tải visible class makeup, app refresh lại core classes để phục hồi lịch chính nếu trước đó bị snapshot làm rỗng.

4. Server snapshot không còn gửi `time: ""`.

## Không thay đổi

- Không cần SQL mới.
- Không đổi UI/UX.
- Không đổi logic xếp dạy bù.
