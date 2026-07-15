# Phase 7K — Database & Query Performance

## Thay đổi chính

- Đăng nhập truy vấn trực tiếp tối đa hai biến thể tài khoản/SĐT, không tải toàn bộ người dùng đang hoạt động.
- Session chỉ lấy các cột user cần thiết và lọc session hết hạn ngay trong Supabase.
- Danh sách lớp/roster dùng selector cột rõ ràng; bỏ `official_students(*)`.
- API tài khoản, giáo viên và đánh giá không còn trả toàn bộ cột hoặc password hash.
- Các response tạo/sửa lớp, thêm/chuyển học sinh dùng payload tối giản nhưng giữ nguyên cấu trúc frontend.
- Gom selector Supabase dùng chung tại `lib/db-selects.ts`.
- Thêm migration index an toàn cho danh sách nhân sự, tìm giáo viên/lớp và roster.
- `npm run audit` tiếp tục bảo vệ role Lễ tân, quyền Học phí và badge Lịch dạy, đồng thời kiểm tra query Phase 7K.

## Migration

Chạy một lần:

`supabase/migrations/20260715_phase7k_database_query_performance.sql`

Migration không sửa hoặc xóa dữ liệu nghiệp vụ.
