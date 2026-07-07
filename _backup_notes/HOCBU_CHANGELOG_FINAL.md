# Changelog Học bù — bản final optimized

## Các nhóm sửa đã gộp

1. Học bù vắng vẫn lưu lịch sử trong popup buổi học bù.
2. Học bù vắng không tạo thêm lượt nghỉ mới, chỉ đưa lượt vắng gốc về Chờ xếp.
3. Học bù Có mặt/Muộn chuyển trạng thái Đã học bù, không còn ở Chờ xếp.
4. Nếu đã từng Vắng học bù rồi sửa lại Có mặt, hệ thống chuyển lại completed đúng.
5. Card Lịch dạy hiển thị tổng vắng = vắng chính + vắng học bù.
6. Admin/Quản lí sửa điểm danh gốc bị nhầm thì tự hủy học bù phát sinh sai, xóa lượt vắng gốc.
7. Thêm bảng Đã học bù trong tab Học bù.
8. Reset tự động theo tháng ở tab Học bù, nhưng không xóa lịch sử Lịch dạy/Điểm danh.
9. Thêm API riêng `/api/makeup/state?month=YYYY-MM` để tối ưu tốc độ.
10. Thêm SQL index Supabase tối ưu query học bù theo tháng.
