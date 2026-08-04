# Deploy Phase 8D.4.11

- Không có migration SQL mới.
- Sửa lỗi tab PDF bị ép quay về Word.
- PDF không còn bị đổi `type` thành Word trong runtime hoặc bước normalize dữ liệu.
- Tab Word/PDF/Audio hoạt động độc lập và giữ trạng thái sau reload.
- File PDF cũ lưu nhầm `type=word` vẫn được nhận diện đúng qua phần mở rộng/MIME.
- Chạy `npm ci && npm run verify` trước khi push.

Build: `20phase8d4-11-library-pdf-tab-fix`
