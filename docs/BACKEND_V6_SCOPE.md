# Backend V6 scope: Giáo viên + phân quyền + reset mật khẩu + gán lớp

Bản này bổ sung phần quản lý giáo viên chính thức:

## Chức năng

1. Quản lý giáo viên thật bằng Supabase.
2. Tạo tài khoản giáo viên / quản lí / admin.
3. Tự tạo mật khẩu tạm 6 số.
4. Reset mật khẩu giáo viên.
5. Phân quyền:
   - Admin
   - Quản lí
   - Giáo viên
6. Gán giáo viên vào lớp.
7. Bỏ gán giáo viên khỏi lớp.
8. Giáo viên chỉ lấy danh sách lớp được gán qua API `/api/classes`.
9. Admin/Quản lí thấy toàn bộ lớp.
10. UI phân quyền được làm lại bằng các thẻ quyền rõ ràng.

## API mới

- `GET /api/teachers`
- `POST /api/teachers`
- `PATCH /api/teachers`
- `POST /api/teachers/[id]/reset-password`
- `POST /api/teachers/[id]/classes`

## Migration mới

`supabase/migrations/006_teacher_permissions.sql`
