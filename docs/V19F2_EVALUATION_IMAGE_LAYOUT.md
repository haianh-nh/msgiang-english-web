# V19F.2 Evaluation Image Layout

Mục tiêu: sửa bố cục ảnh đánh giá để các khung nội dung không bị chồng chéo.

## Vấn đề

Ảnh đánh giá cũ dùng canvas 1800x1120, phần bên phải có 4 khung nhận xét đặt khá sát nhau. Khi hiển thị trong modal hoặc khi nội dung dài, các khung có cảm giác bị đè/chồng lên nhau.

## Đã sửa

1. Tăng canvas ảnh đánh giá từ `1800x1120` lên `1800x1350`.
2. Tăng chiều cao khung tổng thể.
3. Giãn lại bố cục 2 cột:
   - cột biểu đồ kỹ năng,
   - cột nhận xét giáo viên.
4. Tăng chiều cao từng ô nhận xét.
5. Giới hạn số dòng trong từng ô để tránh tràn.
6. Giãn phần tổng quan điểm số để không đè lên biểu đồ.

## Không thay đổi

- Không đổi logic đánh giá.
- Không đổi logic lưu/chốt/gửi.
- Không đổi nội dung dữ liệu.
- Không đổi API/Supabase.
- Không đổi SQL/database.

## Test

1. Mở Đánh giá.
2. Mở một học sinh.
3. Bấm Tạo ảnh.
4. Kiểm tra các ô nhận xét không bị chồng nhau.
5. Nhập nhận xét dài hơn rồi tạo ảnh lại.
6. Kiểm tra ảnh tải xuống vẫn đúng.
