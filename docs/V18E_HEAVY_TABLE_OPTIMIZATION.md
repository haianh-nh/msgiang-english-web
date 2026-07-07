# V18E Heavy Table Optimization

Mục tiêu: giữ nguyên UI/UX nhưng giảm tính toán lặp lại khi dựng các bảng/danh sách dài.

## Đã tối ưu

1. Học phí
   - Cache kết quả group học phí theo lớp.
   - Gộp tính tổng/đã nộp/đã gửi trong một vòng lặp.
   - Không sort lại danh sách học phí khi dữ liệu đã được sort từ bước trước.

2. Lớp học
   - Cache HTML nhóm lớp theo khối.
   - Cache HTML phần lớp đang học/lớp đã học.
   - Tìm kiếm lớp vẫn giữ debounce từ V18B.

3. Lịch dạy
   - `weeklyTable()` dùng map slot/ngày thay vì filter lại toàn bộ sessions cho từng ô.
   - `mobileScheduleList()` dùng map theo ngày thay vì filter lại 7 lần.
   - Giao diện lịch giữ nguyên.

4. Thư viện
   - Cache danh sách giá trị filter: Level/Skill/Unit.
   - Giảm sort/filter lặp lại khi render trang thư viện.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi SQL.
- Không đổi database.
- Không đổi logic học phí.
- Không đổi logic điểm danh/học bù.
- Không đổi luồng login chính.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Mở Lớp học, tìm lớp, mở popup lớp.
2. Mở Lịch dạy, đổi tuần, kiểm tra lịch desktop/mobile.
3. Mở Học phí, tìm học sinh/lớp, lọc đã đóng/chưa đóng.
4. Gửi/chốt học phí thử một học sinh.
5. Mở Thư viện, đổi filter Level/Skill/Unit.
6. Reload trang và kiểm tra dữ liệu vẫn đúng.
