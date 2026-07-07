# V20L.1 — PDF library upload fix

## Vấn đề

Phần thư viện bài tập trước đó chỉ đang cho upload Word/Audio. Vì vậy file PDF bị chặn ở cả frontend, backend và Supabase Storage/type constraint.

## Đã sửa

### Frontend

- Cho chọn file `.pdf` trong input upload.
- Thêm option `PDF` trong loại tài liệu.
- Tự nhận diện `.pdf` khi chọn file.
- Thêm tab `PDF`.
- Card PDF có nút `Xem PDF` và `Mở / tải PDF`.
- PDF preview mở bằng iframe trình duyệt.

### Backend

- `/api/library` chấp nhận `type = pdf`.
- Validate `.pdf` / `application/pdf`.
- Upload PDF lên Supabase Storage với content type `application/pdf`.
- Trả item PDF về frontend như Word/Audio.

### Database / Storage

Thêm migration:

```text
supabase/migrations/20260703_v20l1_restore_pdf_library_upload.sql
```

Migration này:
- đổi CHECK constraint type thành `word | pdf | audio`,
- thêm `application/pdf` vào allowed MIME types của bucket `official-exercise-library`.

## Cần chạy SQL

Phải chạy file SQL V20L.1 trong Supabase trước khi upload PDF, nếu không Supabase có thể báo lỗi do constraint hoặc bucket MIME whitelist.

## Không đổi

- Không đổi logic học bù.
- Không đổi học phí.
- Không đổi điểm danh.
- Không đổi phân quyền.
