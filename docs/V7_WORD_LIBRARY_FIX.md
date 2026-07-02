# V7 Word Library Fix

Sửa thư viện bài tập để upload file Word thay cho PDF.

## Thay đổi

- Tab `PDF` đổi thành `Word`.
- Chỉ nhận bài tập dạng `.doc` / `.docx`.
- Audio vẫn giữ: `.mp3`, `.wav`, `.m4a`, `.aac`.
- API `/api/library` validate file Word thay vì PDF.
- Storage bucket allowed mime types đổi sang Word + Audio.
- Nếu đã chạy migration 007 trước đó, chạy thêm `008_exercise_library_word_fix.sql`.

## Migration

- Fresh install: `007_exercise_library_storage.sql` đã được cập nhật.
- Existing database: chạy thêm `008_exercise_library_word_fix.sql`.
