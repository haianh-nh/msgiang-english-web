# V20L.2 — Attendance Override & Absence Display Fix

## Mục tiêu

Chuẩn hóa lại logic điểm danh:

- Giáo viên chỉ điểm danh trong khung giờ chính thức.
- Admin/Quản lí được điểm danh sớm và sửa điểm danh ngoài giờ/đã khóa.
- Khi lưu điểm danh, học sinh không bấm trạng thái vẫn được lưu mặc định là `Có mặt`.
- Học sinh đánh `Vắng` sinh đúng lượt học bù.
- Nếu đổi `Vắng → Có mặt/Muộn`, lượt vắng pending sẽ bị gỡ khỏi danh sách chờ.
- Nếu lượt vắng đã được xếp học bù, hệ thống sẽ chặn sửa thành Có mặt/Muộn cho đến khi hủy lịch học bù.

## Logic thời gian

### Giáo viên

```text
Mở điểm danh: từ 15 phút trước giờ học đến 23:59 cùng ngày.
Ngoài khung này: không lưu/sửa được.
```

### Admin / Quản lí

```text
Được điểm danh sớm.
Được sửa điểm danh ngoài giờ.
Được sửa lớp đã dạy và điểm danh đã đóng.
```

## Backend validation

`/api/attendance/save` đã kiểm tra:

- user có quyền điểm danh lớp đó,
- giáo viên thường chỉ được lưu trong giờ mở điểm danh,
- Admin/Quản lí được override,
- không cho đổi lượt vắng đã xếp học bù sang Có mặt/Muộn nếu chưa hủy học bù.

## Không cần SQL

Bản này không thêm bảng/cột database.
