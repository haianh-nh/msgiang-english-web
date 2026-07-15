# Phase 7J — Code Cleanup & Architecture

Bản này không thay đổi logic nghiệp vụ hoặc database.

Các contract được bảo vệ tự động:

- Role Lễ tân vẫn hiển thị và có quyền quản lý vận hành.
- Lễ tân vẫn không có menu, cache, route hoặc API Học phí.
- Badge Lịch dạy không bị CSS trạng thái nhân sự ghi đè.
- Popup dùng utility loading/action lock chung.
- Build marker của asset và server phải đồng bộ trước khi build.

Chạy kiểm tra:

```bash
npm run verify
```
