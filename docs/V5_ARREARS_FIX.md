# V5 Arrears Fix

Sửa logic công nợ học phí:

- Học phí tháng đang xem = phát sinh tháng đó + công nợ các tháng trước chưa nộp.
- Nếu tháng trước chưa nộp, số tiền đó được cộng sang tháng sau.
- Khi admin/quản lí bấm Đã nộp trên tổng phải thu, hệ thống đánh dấu đã nộp cho tháng đang xem và các tháng nợ cũ nằm trong tổng đó.
- Nếu muốn chỉ trừ một tháng cũ, có thể chọn lại tháng cũ đó và xác nhận Đã nộp.
- Phần ảnh gửi phụ huynh hiển thị:
  - Học phí phát sinh tháng này
  - Công nợ cũ
  - Tổng học phí cần đóng

Không thay đổi bố cục bảng học phí.
