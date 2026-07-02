# Backend V5 scope: Học phí thật theo điểm danh

Bản này nối backend thật cho học phí:

1. Học phí tính từ bảng điểm danh thật:
   - official + present: tính tiền
   - official + late: tính tiền
   - makeup/manual_makeup + present hoặc late: tính tiền
   - official + absent: không tính tiền
   - buổi nghỉ/cancel không phát sinh attendance nên không tính tiền
2. Mức giá lấy từ Settings thật `tuition_per_session`, mặc định 70.000đ/buổi.
3. UI có bộ lọc tháng học phí.
4. Trạng thái đã nộp / đã gửi phụ huynh lưu vào Supabase.
5. Sau khi lưu điểm danh, học phí được refresh lại.

## API mới

- `GET /api/tuition/state?month=YYYY-MM`
- `POST /api/tuition/status`

## Migration mới

`supabase/migrations/005_tuition_real.sql`
