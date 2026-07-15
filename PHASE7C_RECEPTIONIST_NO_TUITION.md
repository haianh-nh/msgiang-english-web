# Phase 7C — Role Lễ tân không truy cập Học phí

## Role mới

- Mã role: `receptionist`
- Tên hiển thị: **Lễ tân**
- Lễ tân có quyền quản lý vận hành tương tự Quản lí: lớp học, học sinh, lịch dạy, điểm danh, học bù, giáo viên/tài khoản và thư viện tài liệu.
- Các chức năng cấu hình hệ thống, backup và tạo tài khoản Lễ tân vẫn chỉ dành cho Admin.

## Cách ly dữ liệu Học phí

Với tài khoản Lễ tân:

- Không có nút **Học phí** trên sidebar.
- Không thể mở route Học phí bằng đường dẫn hoặc thao tác nội bộ.
- Các API `/api/tuition/*` trả về `403`.
- Không tải module Học phí trong prefetch/realtime/cache mutation.
- Không lưu dữ liệu Học phí trong snapshot/cache dành cho tài khoản Lễ tân.
- API lớp và học sinh không trả về các trường Học phí.
- Form thêm học sinh không hiển thị hoặc gửi phần tính Học phí.
- Các thông báo vận hành không hiển thị số tiền, tháng khấu trừ hoặc trạng thái thanh toán.

## Cài đặt

1. Chạy migration:
   `supabase/migrations/20260715_receptionist_role_no_tuition.sql`
2. Redeploy dự án.
3. Đăng nhập bằng Admin.
4. Vào **Cài đặt & tài khoản** → **+ Tạo Lễ tân**.
5. Giao mật khẩu tạm cho nhân viên; hệ thống yêu cầu đổi mật khẩu khi đăng nhập lần đầu.

## Build

`20phase7c-receptionist-no-tuition`
