# Phase 8D.4.9 — Library PDF/DOCX Preview

## Mục tiêu

- Xem trước PDF và DOCX trực tiếp trong Thư viện bài tập.
- Chuẩn hóa thao tác trên thẻ tài liệu.
- Không làm nặng lần mở app đầu tiên.

## Thay đổi

- PDF mở trong popup gần toàn màn hình bằng trình xem PDF của trình duyệt; có thanh công cụ chuyển trang và zoom tùy trình duyệt.
- DOCX chỉ được tải và chuyển sang HTML sau khi bấm `Xem trước`.
- Mammoth giữ nội dung, ảnh và bảng cơ bản; HTML được lọc trước khi trả về trình duyệt.
- File `.doc` cũ và DOCX trên 15 MB không chuyển đổi trực tiếp; popup cung cấp nút tải xuống.
- Kết quả DOCX được cache trong phiên trình duyệt.
- Thêm route `/api/library/[id]/file` để xem inline/tải xuống có kiểm tra quyền.
- Backend và frontend nhận diện file bằng extension/MIME thật, không chỉ dựa vào cột `type` cũ.
- Nút thẻ: `Xem trước | Tải xuống | Xóa`.

## Phân quyền

- Admin, Quản lí, Lễ tân, Giáo viên và TA có thể xem/tải theo quyền Thư viện hiện tại.
- Nút Xóa vẫn chỉ xuất hiện theo `canDeleteLibrary()` hiện tại.

## Database

Không có migration SQL mới.
