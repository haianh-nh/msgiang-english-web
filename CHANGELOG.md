# Changelog

## Phase 7K — Database & Query Performance

- Đăng nhập truy vấn trực tiếp theo tài khoản/SĐT thay vì tải toàn bộ user active.
- Thu gọn payload của session, lớp/học sinh, tài khoản, giáo viên và đánh giá.
- Gom selector cột Supabase tại `lib/db-selects.ts`.
- Thêm index an toàn cho các query nhân sự, tên lớp/giáo viên và roster.
- Mở rộng `npm run audit` để chặn regression query, role Lễ tân và CSS Lịch dạy.

## Phase 7J — Code Cleanup & Architecture

- Gom trạng thái loading và chống bấm lặp của popup vào `public/v15/modules/ui-runtime.js`.
- Gộp bản vá badge Lịch dạy vào CSS chính; tách hoàn toàn chấm trạng thái nhân sự sang `.staffStatusDot`.
- Xóa hàm và CSS hướng dẫn role không còn được sử dụng.
- Đồng bộ build marker giữa HTML, Next headers và `deployment-version.json`.
- Thêm `npm run audit` và `npm run verify` để chặn deploy khi role Lễ tân, quyền Học phí hoặc CSS Lịch dạy bị sai.
- Chuyển tài liệu phase cũ khỏi thư mục gốc vào `docs/archive/`.

## Phase 7I

- Tối ưu runtime và realtime; bỏ render Lịch dạy định kỳ không cần thiết.

## Phase 7H

- Tối ưu thẻ nhân sự và phản hồi popup.

## Phase 7G

- Tối ưu API Học phí và Đánh giá học sinh.

## Phase 7F

- Tối ưu phản hồi DOM Học phí và Đánh giá học sinh.

## Phase 7E

- Thêm xóa Lễ tân và tối ưu phản hồi trang nhân sự.

## Phase 7C–7D

- Thêm role Lễ tân, chặn hoàn toàn Học phí và bổ sung giao diện quản lý.

## Phase 7L — Frontend Bundle & Asset Performance
- Lazy-load sáu module chức năng theo route.
- Tối ưu logo WebP và favicon.
- Thêm audit ngăn module nặng quay lại tải ở lần mở đầu.

## Phase 7L.1 — Smart Warm-up & Fast Heavy Tabs
- Warm-up thông minh cho Giáo viên, Thư viện, Đánh giá và Học phí theo quyền.
- Gộp API nhân sự, chống request trùng và tránh skeleton bị kẹt.
- Hoãn ghi cache local tới thời gian rảnh của trình duyệt.
