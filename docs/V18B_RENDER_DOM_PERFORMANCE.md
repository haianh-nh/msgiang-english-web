# V18B Render & DOM Performance

Mục tiêu: giữ nguyên UI/UX nhưng giảm render lại DOM lớn trong app chính.

## Đã tối ưu

1. Điểm danh
   - Tick Có mặt/Muộn/Vắng không dựng lại toàn bộ modal nữa.
   - Chỉ đổi trạng thái active của 3 nút trong hàng đang chọn.
   - Nếu DOM không tìm thấy thì fallback về cách cũ để an toàn.

2. Tìm kiếm lớp học
   - Debounce cập nhật danh sách lớp.
   - Giảm dựng lại danh sách khi người dùng đang gõ.

3. Tìm kiếm học phí
   - Debounce render khi gõ tên học sinh/lớp.
   - Bộ lọc UI-only không đẩy snapshot backend liên tục.

4. Thư viện
   - Debounce tìm kiếm.
   - Filter/tab thư viện lưu local nhẹ hơn.
   - Cache kết quả lọc/sort thư viện.

5. Đánh giá
   - Thêm evaluation map theo tháng để giảm `.find()` lặp lại trên từng học sinh.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi SQL.
- Không đổi database.
- Không đổi logic học phí.
- Không đổi logic điểm danh/học bù.
- Không đổi luồng login chính.
- Không sửa autofill mật khẩu.

## Test bắt buộc

1. Mở app chính.
2. Vào Lớp học, gõ tìm lớp.
3. Mở Điểm danh, tick Có mặt/Muộn/Vắng nhiều học sinh.
4. Lưu điểm danh.
5. Mở Học phí, gõ tìm học sinh/lớp, đổi trạng thái paid/unpaid.
6. Mở Thư viện, gõ tìm kiếm, đổi filter.
7. Mở Đánh giá, đổi tháng và mở popup đánh giá.
