# V20B — Mutation refresh optimization

## Mục tiêu

Sau các thao tác thêm/sửa/xóa/lưu, app không refresh dây chuyền quá rộng. Thay vào đó, app cập nhật cache và trạng thái loaded cho đúng module bị ảnh hưởng.

## Đã thêm

### `v20bAfterMutation(keys)`

Hàm điều phối sau mutation:

- clear network GET cache ngắn hạn,
- cập nhật module cache theo dữ liệu local mới nhất,
- đánh dấu đúng module là đã loaded/mutated,
- touch memo/render version để dữ liệu hiển thị nhất quán.

Các nhóm cache được điều phối:

- `core`: classes + teachers
- `teachers`: danh sách giáo viên
- `schedule`: lịch / nghỉ buổi / dạy bù
- `attendance`: điểm danh / vắng / học bù
- `tuition`: học phí / trạng thái đã nộp / đã gửi
- `library`: thư viện bài tập
- `evaluation`: đánh giá học sinh

## Các mutation đã tối ưu

- Học phí: đã nộp, bỏ đã nộp, gửi học phí, gửi hàng loạt.
- Điểm danh: lưu điểm danh, cập nhật vắng/học bù và học phí liên quan.
- Giáo viên: tạo, sửa, gán lớp, bỏ gán, xóa.
- Lớp/học sinh: tạo lớp, thêm học sinh, xóa học sinh, chuyển lớp, kết thúc/mở lại lớp, xóa lớp.
- Lịch dạy: nghỉ buổi, mở lại buổi, xếp lịch dạy bù.
- Học bù: xếp/hủy học bù.
- Thư viện: upload/xóa tài liệu.
- Đánh giá: lưu nháp/chốt gửi.

## Thay đổi quan trọng

Trong xóa lớp, đã bỏ gọi `refreshAllOfficialDataForCurrentUser()` sau mutation. App giờ cập nhật đúng các module bị ảnh hưởng thay vì refresh toàn bộ.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi workflow nghiệp vụ.
- Không đổi API.
- Không đổi SQL/database.
