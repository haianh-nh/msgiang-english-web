# V7 Simple Word Preview

Sửa UI thư viện bài tập cực đơn giản và thêm xem trước Word.

## UI card tối giản

Chỉ còn:
- Tên bài tập
- Lớp / kỹ năng / unit
- Ngày upload / người upload
- Nút Xem trước
- Nút Mở / tải Word
- Nút Xóa nếu Admin/Quản lí

## Preview

- `.docx`: đọc text bằng `mammoth` qua API `/api/library/[id]/preview`.
- `.doc`: không preview trực tiếp; chỉ cho tải/mở bằng Word hoặc Google Docs.
- Audio vẫn nghe trực tiếp bằng audio player.
