# Backend V7: Thư viện bài tập PDF/Audio thật

Bản này thay phần thư viện mock bằng thư viện thật dùng Supabase.

## Chức năng

1. Upload PDF thật lên Supabase Storage.
2. Upload Audio thật lên Supabase Storage.
3. Lưu metadata vào bảng `official_exercise_library`.
4. Tìm/lọc theo:
   - Loại file: PDF / Audio
   - Khối / Level
   - Kỹ năng
   - Unit / Chủ đề
   - Tên file / người upload
5. Xem PDF trực tiếp trong popup bằng iframe.
6. Nghe Audio trực tiếp bằng audio player.
7. Mở/tải file qua link public.
8. Giáo viên / Quản lí / Admin được upload.
9. Chỉ Admin / Quản lí được xóa.
10. Xóa tài liệu sẽ soft-delete metadata và xóa file trong Storage.

## API mới

- `GET /api/library`
- `POST /api/library`
- `DELETE /api/library/[id]`

## Migration mới

`supabase/migrations/007_exercise_library_storage.sql`

## Storage bucket

`official-exercise-library`

Bucket public để giáo viên mở nhanh file PDF/Audio trong trình duyệt.
