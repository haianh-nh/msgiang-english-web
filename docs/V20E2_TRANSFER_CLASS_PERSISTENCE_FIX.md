# V20E.2 — Transfer class persistence fix

## Vấn đề tìm thấy

Logic `Chuyển lớp` trước đó chỉ tạo lớp mới trong local frontend:

- `db.classes.push(...)`
- `old.status = ended`

Nhưng không ghi lên server. Khi refresh `/api/classes`, dữ liệu server vẫn chưa có lớp mới và lớp cũ có thể vẫn `active`.

## Đã sửa

### 1. Tạo lớp mới thật trên server

Khi bấm `Tạo lớp mới & chuyển lớp`, frontend gọi:

```text
POST /api/classes
```

với tên lớp mới, giáo viên, trợ giảng, ngày bắt đầu và lịch học.

### 2. Copy học sinh được chọn sang lớp mới trên server

Mỗi học sinh được chọn được tạo thành một student record mới trong lớp mới:

```text
POST /api/classes/:newClassId/students
```

Lớp cũ vẫn giữ student record cũ để bảo toàn lịch sử điểm danh/học phí/đánh giá.

### 3. Kết thúc lớp cũ trên server

Sau khi tạo lớp mới và copy học sinh thành công, lớp cũ được PATCH:

```text
PATCH /api/classes/:oldClassId
{ status: "ended", endDate }
```

### 4. Giữ dữ liệu lớp cũ

Chuyển lớp không xóa:

- điểm danh lớp cũ,
- học phí lớp cũ,
- đánh giá lớp cũ,
- lịch sử học bù/dạy bù,
- học sinh lớp cũ.

Dữ liệu chỉ bị xóa khi Admin/Quản lí dùng chức năng `Xóa lớp`.

### 5. Tạo đánh giá nháp cho lớp mới

Hệ thống cố gắng tạo đánh giá nháp cho học sinh mới. Nếu tạo đánh giá nháp lỗi, quá trình chuyển lớp vẫn không bị đảo ngược.

## Không cần SQL mới

Bản này dùng API hiện có:

- `/api/classes`
- `/api/classes/:id`
- `/api/classes/:id/students`
- `/api/evaluations`
