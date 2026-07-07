# V19F.1 Evaluation Score Smooth

Mục tiêu: sửa trải nghiệm chọn điểm kỹ năng trong popup Đánh giá.

## Vấn đề

Ở V19F, mỗi lần bấm điểm 1–5, hàm `setEvalScore()` gọi lại `openEvalModal(studentId,true)`, làm popup render lại toàn bộ. Điều này gây cảm giác giật/khó chịu khi chấm nhiều kỹ năng liên tục.

## Đã sửa

1. `setEvalScore()` không mở lại popup nữa.
2. Chỉ cập nhật trực tiếp:
   - biểu đồ kỹ năng,
   - điểm trung bình,
   - trạng thái nút 1–5 của kỹ năng vừa chọn,
   - trạng thái bản nháp.
3. Dữ liệu vẫn được lưu vào state như trước.

## Không thay đổi

- Không đổi UI/UX tổng thể.
- Không đổi modal Đánh giá.
- Không đổi logic Lưu nháp.
- Không đổi logic Chốt/Gửi.
- Không đổi API/Supabase.
- Không đổi SQL/database.

## Test

1. Mở Đánh giá.
2. Mở một học sinh.
3. Bấm Chỉnh sửa.
4. Chọn nhanh nhiều điểm 1–5.
5. Popup không được đóng/mở lại.
6. Biểu đồ và điểm trung bình cập nhật ngay.
7. Bấm Lưu nháp hoặc Chốt/Gửi.
8. Mở lại kiểm tra điểm vẫn đúng.
