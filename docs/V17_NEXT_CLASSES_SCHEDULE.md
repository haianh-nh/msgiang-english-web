# V17 Next Classes + Schedule

Mục tiêu: tách dần Lớp học + Lịch dạy sang Next.js thật, nhưng vẫn giữ app V15 làm nơi thao tác nghiệp vụ đầy đủ.

## Thay đổi

1. Thêm trang Next.js:
   - `/classes`
   - `/schedule`
2. Dashboard V16 mở:
   - Lớp học → `/classes`
   - Lịch dạy → `/schedule`
3. `/classes`:
   - Hiển thị danh sách lớp nhanh bằng server render.
   - Có tìm kiếm và tab Đang học/Đã học/Tất cả.
   - Thêm/Import/Chi tiết vẫn mở app V15 để tránh đổi logic.
4. `/schedule`:
   - Hiển thị lịch tuần bằng server render.
   - Có Tuần trước/Tuần sau.
   - Hiển thị trạng thái Đã dạy/Đang dạy/Chưa dạy/Nghỉ.
   - Xếp lịch/học bù vẫn mở app V15.

## Không thay đổi

- Không đổi SQL.
- Không đổi database.
- Không đổi API cũ.
- Không đổi logic học phí.
- Không đổi logic điểm danh.
- Không đổi logic xếp học bù.
- Không đổi logic xóa lớp.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Login Admin → Dashboard.
2. Mở `/classes`.
3. Tìm kiếm lớp, đổi tab Đang học/Đã học.
4. Bấm + Thêm/Import → mở app V15 đúng tab lớp.
5. Mở `/schedule`.
6. Chuyển tuần trước/tuần sau.
7. Bấm Xếp lịch/học bù → mở app V15 đúng tab lịch.
8. Login giáo viên → `/classes` chỉ thấy lớp giáo viên được phân công.
9. Login giáo viên → `/schedule` chỉ thấy lịch lớp giáo viên được phân công.
