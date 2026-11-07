# Phase 8D.4.13 – Tab Học bù: mỗi tháng là một thẻ riêng

## Nguyên tắc
Mọi dữ liệu học bù thuộc về **tháng học sinh vắng** (tháng phát sinh).
Chọn tháng nào thì tab Học bù chỉ hiện dữ liệu của tháng đó; xóa tháng nào thì mất đúng tháng đó.

## Thay đổi
- **Chờ xếp**: chỉ hiện lượt vắng của tháng đang chọn (trước đây gom mọi tháng).
- **Lượt vắng / Đã xếp / Đã học bù**: lọc theo tháng vắng. Lượt vắng tháng 10 được xếp bù sang
  tháng 11 vẫn nằm ở thẻ Tháng 10, kèm ghi chú nhỏ "Học bù Tháng 11 / 2026".
- **Popup xếp học bù ở Lịch dạy và popup Thêm lớp học kèm** (phương án A): vẫn chọn được lượt
  chờ của mọi tháng chưa xóa. Sau khi xếp, lượt đó chuyển sang "Đã xếp" ở thẻ tháng vắng.
- **Xóa tháng**: ngoài việc ẩn tháng, API `/api/makeup/months` (POST) hủy các lịch học bù còn
  `scheduled` (chưa diễn ra) của lượt vắng tháng đó, để học sinh không còn hiện trong buổi học bù
  ở Lịch dạy. Buổi đã học bù và lịch sử điểm danh giữ nguyên. Thông báo xác nhận đã cập nhật.
- Đổi tháng luôn tải dữ liệu mới từ server (`force` → `forceNetwork`).
- API legacy trả `availableMonths` rỗng không còn xóa danh sách tháng trên giao diện.
- Tăng build version để trình duyệt tải lại JS mới.

## Không thay đổi
- Không cần migration SQL. Không đổi quyền, công thức điểm danh, học phí.
