# Phase 8D.4.12 — Library All Tab & Fast Loading

## Thay đổi

- Bổ sung `Tất cả | Word | PDF | Audio`; `Tất cả` là lựa chọn mặc định sau khi mở hoặc reload tab.
- Giữ một danh sách metadata duy nhất; đổi loại file chỉ lọc trong bộ nhớ.
- Patch riêng vùng tab, bộ lọc và danh sách tài liệu để không render lại shell/sidebar/toàn trang.
- Memo hóa thống kê loại file và danh sách giá trị bộ lọc.
- Disk cache metadata riêng cho Thư viện có thời hạn 24 giờ; cache cũ chỉ dùng để vẽ nhanh rồi revalidate nền.
- Ưu tiên Thư viện trong smart warm-up.
- Audio card dùng `preload="none"`; PDF/DOCX vẫn chỉ tải nội dung khi bấm Xem trước.
- Nút Tải lại buộc lấy metadata mới từ API.

## Không thay đổi

- Upload, xem trước PDF/DOCX, tải xuống và xóa.
- Phân quyền hiện tại.
- Supabase schema và dữ liệu.
