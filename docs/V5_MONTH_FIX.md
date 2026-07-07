# V5 Month Fix

Sửa lỗi học phí bị giữ theo dữ liệu điểm danh cũ khi đổi tháng.

Nguyên nhân:
- UI có fallback tính từ dữ liệu điểm danh local toàn bộ thời gian.
- Khi chọn tháng không có điểm danh, backend trả rollup rỗng nhưng UI fallback sang dữ liệu cũ nên vẫn hiện 70.000đ.

Đã sửa:
- Lưu `db.tuitionRollupMonth`.
- Khi đã tải học phí tháng từ Supabase, học sinh không có rollup trong tháng đó sẽ có học phí = 0.
- Khi đổi tháng/năm, clear rollup/payments/messages cũ trước khi fetch tháng mới.
- Trạng thái đã nộp/đã gửi vẫn tách theo `YYYY-MM_studentId`.
