# V20E.1 — End class persistence fix

## Vấn đề

Chức năng `Kết thúc lớp` trước đó chỉ đổi trạng thái ở local frontend:

- Không PATCH lên `/api/classes/[id]`.
- Khi `/api/classes` refresh lại, lớp có thể bị server trả về `active`.
- Lớp không chuyển ổn định xuống phần `Lớp đã học`.

## Đã sửa

### 1. Kết thúc lớp lưu lên server

`endClass(classId)` bây giờ gọi:

```text
PATCH /api/classes/:id
{ status: "ended", endDate }
```

Sau khi thành công:

- cập nhật lại `db.classes`,
- invalidate schedule cache,
- render lại trang Lớp học,
- lớp chuyển xuống phần `Lớp đã học`.

### 2. Mở lại lớp cũng lưu lên server

`reactivateClass(classId)` gọi:

```text
PATCH /api/classes/:id
{ status: "active", endDate: null }
```

### 3. Giữ nguyên dữ liệu liên quan

Kết thúc lớp chỉ đổi trạng thái lớp.

Không xóa:

- điểm danh,
- học phí,
- đánh giá,
- lịch sử học bù/dạy bù,
- học sinh.

Dữ liệu chỉ bị dọn khi dùng chức năng `Xóa lớp`.

## Không thay đổi

- Không đổi database.
- Không cần SQL mới.
- Không đổi logic học phí/điểm danh.
- Không đổi chức năng xóa lớp.
