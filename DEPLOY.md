# Deploy Phase 8D.4.9

- Không có migration SQL mới.
- PDF được xem trước trong popup bằng trình xem PDF của trình duyệt.
- DOCX được chuyển thành HTML khi bấm Xem trước; giữ văn bản, ảnh và bảng cơ bản.
- File `.doc` cũ hoặc DOCX quá lớn sẽ yêu cầu tải xuống.
- Thẻ tài liệu dùng thống nhất `Xem trước`, `Tải xuống`, `Xóa`.
- API nhận diện định dạng theo tên file/MIME thật và tự sửa trường hợp PDF bị lưu nhầm nhãn Word ở frontend.
- Chạy `npm ci && npm run verify` trước khi push.

Build: `20phase8d4-10-tutoring-today-fix`
