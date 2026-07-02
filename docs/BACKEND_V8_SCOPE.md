# Backend V8: Đánh giá học sinh thật

Bản này chuyển phần Đánh giá HS sang dữ liệu thật lưu Supabase.

## Chức năng

1. Lưu đánh giá học sinh thật vào bảng `official_evaluations`.
2. Đánh giá theo tháng `YYYY-MM`.
3. Mỗi học sinh có điểm kỹ năng:
   - Listening / Nghe
   - Speaking / Nói
   - Reading / Đọc
   - Writing / Viết
   - Vocabulary / Từ vựng
   - Participation / Tham gia
   - Homework / Bài tập
4. Giáo viên chỉ đánh giá học sinh trong lớp mình dạy.
5. Admin/Quản lí xem và đánh giá toàn bộ.
6. Lưu nhận xét:
   - Tổng quan
   - Điểm mạnh
   - Cần cải thiện
   - Gợi ý phụ huynh
7. Trạng thái:
   - Bản nháp
   - Đã chốt/gửi
8. Ảnh đánh giá dùng dữ liệu thật, chữ nhỏ hơn, tránh chồng chéo khi nhận xét dài.
9. Biểu đồ và chú thích đã chuyển sang tiếng Việt cho phụ huynh dễ hiểu.

## API mới

- `GET /api/evaluations?month=YYYY-MM`
- `POST /api/evaluations`

## Migration mới

`supabase/migrations/009_evaluations_real.sql`
