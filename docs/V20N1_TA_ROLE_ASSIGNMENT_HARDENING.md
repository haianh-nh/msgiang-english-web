# V20N.1 — TA Role Assignment Hardening

Bản kiểm tra kỹ sau V20N.

## Vá thêm

- Không cho gán/bỏ gán giáo viên hoặc TA vào lớp đã kết thúc ở cả UI và API.
- Không cho xóa nhân sự đang nằm trong lớp đã kết thúc để giữ nguyên lịch sử lớp.
- Khi xóa nhân sự khỏi lớp đang học, frontend xóa cả vai trò giáo viên chính và TA khỏi cache local.
- Không cho chọn cùng một người vừa là giáo viên chính vừa là TA trong cùng lớp.
- SQL role constraint bổ sung `parent` để không làm hỏng dữ liệu nếu có tài khoản phụ huynh trong `official_users`.

## Không đổi

- TA vẫn có quyền điểm danh, xếp học bù, đánh giá và sửa đánh giá cho lớp được gán.
- TA không thấy học phí, quản lý tài khoản, tạo/sửa/xóa lớp.
- Lớp đã kết thúc vẫn khóa hoàn toàn.
