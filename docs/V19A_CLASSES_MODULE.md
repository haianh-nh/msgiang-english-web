# V19A Classes Module

Mục tiêu: bắt đầu giai đoạn V19 bằng cách tách module thật nhưng vẫn clone UI hiện tại y nguyên.

## Đã làm

1. Tách phần render trang Lớp học ra file riêng:
   - `public/v15/modules/classes.js`

2. Các phần đã chuyển khỏi app core:
   - `classGroupsMarkup()`
   - `classSectionsMarkup()`
   - `classCard()`
   - `classesPage()`
   - `filterClasses()`

3. `public/index-v15.html` tải module Lớp học trước `app.js`:
   - `/v15/modules/classes.js`
   - `/v15/app.js`

## Kết quả

- `public/v15/app.js` trước: 507,348 bytes.
- `public/v15/app.js` sau: 504,181 bytes.
- Module mới: `public/v15/modules/classes.js`.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi màu.
- Không đổi bố cục.
- Không đổi wording.
- Không đổi popup lớp/học sinh.
- Không đổi SQL.
- Không đổi database.
- Không đổi logic nghiệp vụ.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Mở app chính.
2. Login Admin.
3. Mở Lớp học.
4. Kiểm tra danh sách lớp hiển thị giống bản trước.
5. Tìm lớp/giáo viên.
6. Mở popup chi tiết lớp.
7. Thêm lớp mới.
8. Thêm học sinh.
9. Xóa học sinh thử nếu cần.
10. Chuyển sang Lịch dạy/Điểm danh/Học phí để đảm bảo module khác không bị ảnh hưởng.

## Ghi chú

V19A mới tách phần render/list của Lớp học. Các hàm dùng chung và một số popup/CRUD vẫn ở app core để giảm rủi ro. Các bước V19 tiếp theo sẽ tách dần từng module theo cách này, không thiết kế lại UI.
