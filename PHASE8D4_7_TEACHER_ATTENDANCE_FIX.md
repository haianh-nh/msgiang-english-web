# Phase 8D.4.7 – Teacher Attendance Fix

## Vấn đề đã kiểm tra

Một số tài khoản Giáo viên/TA có thể thấy lịch nhưng không lưu được điểm danh do hai nguyên nhân không đồng nhất:

1. Frontend ghép ngày/giờ theo timezone của thiết bị, còn API kiểm tra theo giờ Việt Nam.
2. Dữ liệu cũ có thể có nhiều `official_teachers` cùng tài khoản/SĐT. Một số luồng dùng `limit 1`, nhưng API điểm danh cũ dùng `maybeSingle()`, dẫn tới không xác định được giáo viên.

## Thay đổi

- Mọi cửa sổ điểm danh và trạng thái buổi học dùng UTC+07:00 cố định.
- Hỗ trợ nhiều teacher profile hợp lệ của cùng một tài khoản.
- API lớp và lịch dạy bù dùng toàn bộ teacher identity liên quan.
- Frontend không lọc lại lớp giáo viên bằng tên/SĐT sau khi server đã phân quyền.
- Buổi dạy bù giữ đúng `class_makeup` khi lưu điểm danh.
- API trả mã lỗi rõ ràng: chưa liên kết hồ sơ, chưa được phân công, chưa đến giờ hoặc đã quá ngày.

## Database

Không bắt buộc chạy SQL. File `sql/CHECK_TEACHER_ATTENDANCE_LINKS.sql` chỉ dùng để kiểm tra dữ liệu cũ nếu vẫn còn tài khoản gặp lỗi.
