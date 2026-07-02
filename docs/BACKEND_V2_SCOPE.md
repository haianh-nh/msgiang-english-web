# Backend V2 scope: Classes + Import file

Bản này nối backend thật cho phần Lớp học và Import:

- `GET /api/classes`: lấy danh sách lớp/giáo viên/học sinh từ Supabase theo format V48.
- `POST /api/classes`: tạo lớp thật.
- `PATCH /api/classes/[id]`: sửa lớp thật.
- `DELETE /api/classes/[id]`: xóa lớp thật.
- `POST /api/classes/[id]/students`: thêm học sinh thật vào lớp.
- `DELETE /api/students/[id]`: xóa học sinh thật.
- `POST /api/import/classes`: import lớp/học sinh từ CSV/XLS/XLSX.
- UI V48 đã duyệt được giữ nguyên, chỉ thêm nút Import file ở màn hình Lớp học.

## Mẫu file import

`public/import-template.csv`
