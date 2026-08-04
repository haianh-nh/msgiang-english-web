# Phase 8D.4.10 — Tutoring Today Fix

- Sửa tạo lớp Học kèm khi chọn lượt vắng từ nhiều tháng.
- Ngày mặc định dùng lịch Việt Nam.
- Kiểm tra rõ giáo viên/TA còn hoạt động.
- Không cần SQL.

# Changelog

## Phase 8D.4.9 – Library PDF/DOCX Preview

- Thêm popup xem trước PDF gần toàn màn hình với trình xem tích hợp của trình duyệt.
- DOCX được chuyển sang HTML theo yêu cầu, hỗ trợ văn bản, ảnh và bảng cơ bản.
- Thêm giới hạn dung lượng và phương án tải xuống cho `.doc`, file lớn, file lỗi hoặc không thể chuyển đổi.
- Thêm API file có kiểm tra quyền để xem inline hoặc tải xuống với đúng tên file.
- Chuẩn hóa nút thẻ thành `Xem trước`, `Tải xuống`, `Xóa`; giữ nguyên phân quyền Xóa.
- Nhận diện định dạng theo phần mở rộng/MIME thật, sửa trường hợp PDF bị lưu nhầm trong tab Word.
- Cache kết quả xem trước DOCX trong phiên để không chuyển đổi lại cùng một file.
- Không cần migration SQL.

## Phase 8D.4.8 – Cross-month Makeup Backlog

- Danh sách Chờ xếp học bù hiển thị mọi lượt vắng còn tồn đọng, không giới hạn tháng đang xem.
- Popup xếp học bù trong Lịch dạy và popup tạo lớp Học kèm đều dùng cùng backlog toàn bộ tháng.
- Loại lượt thuộc tháng đã xóa, lượt đã có lịch và lượt đã hoàn tất.
- Hiển thị rõ tháng phát sinh/ngày nghỉ gốc để tránh nhầm khi xếp sang tháng mới.
- Đổi cache schema Học bù để không khôi phục dữ liệu lọc tháng cũ sau deploy.
- Không cần migration SQL.

## Phase 8D.4.7 – Teacher Attendance Fix

- Sửa lỗi một số Giáo viên/TA không lưu được điểm danh do timezone thiết bị.
- Không còn dùng `maybeSingle()` để xác định hồ sơ giáo viên.
- Hỗ trợ nhiều hồ sơ giáo viên cùng tài khoản/SĐT trong dữ liệu cũ.
- Đồng bộ quyền lớp chính, TA và buổi dạy bù.
- Thêm thông báo lỗi quyền điểm danh rõ ràng.
- Không cần migration SQL.

## Phase 8D.4.6 — Staff Tutoring Visibility Fix

- Sửa thiếu sót của 8D.4.5: popup giáo viên không còn hiển thị lớp Học kèm.
- Dropdown gán lớp trong popup nhân sự không còn liệt kê lớp Học kèm.
- Thẻ nhân sự, số lớp, `+X lớp` và tìm kiếm chỉ dựa trên lớp chính.
- Mở rộng nhận diện lớp Học kèm theo tên, grade, note, session kind và source session key.
- Không thay đổi database, API hoặc nghiệp vụ Học kèm ở các tab khác.

## Phase 8D.4.5 — Staff Main-Class Cards

- Ẩn lớp Học kèm khỏi thẻ Giáo viên, TA và Quản lí.
- Số lớp và nhãn `+X lớp` chỉ tính lớp chính.
- Không thay đổi database hoặc API.

## Phase 8D.4.4 — Tuition Search Reset

- Sửa lỗi ô tìm kiếm Học phí tự khôi phục mã lớp sau khi reload.
- Không còn lưu từ khóa tìm kiếm vào local snapshot hoặc official snapshot.
- Snapshot cũ được làm sạch khi bootstrap; tháng/năm vẫn được giữ nguyên.
- Không thay đổi database, API hoặc công thức học phí.

- Compact tuition table for full-screen desktop use.
- Removed tuition image generation.
- Expanded class tables without internal vertical scrolling.
- Class summary now shows paid count.
- Students not yet billable remain visible with a zero-fee status.

## Phase 8D.4.1 — Tuition style hotfix

- Sửa giao diện thẻ tổng quan Học phí đôi lúc bị kéo thành các dải ngang.
- Chuyển CSS dùng chung của `.statGrid`, `.stat` và `.statIcon` về CSS lõi để Học phí không phụ thuộc vào việc tab Tổng quan đã từng được mở hay chưa.
- Lazy CSS chỉ được đánh dấu sẵn sàng sau `link.onload`; link lỗi/stale được xóa và có thể tải lại.
- Trang chỉ render module khi cả JavaScript và CSS của route đều đã sẵn sàng.
- Đồng bộ build marker cho index, API version, response headers và runtime.
- Không thay đổi database, API nghiệp vụ hay logic học phí.

## Phase 8D.4 — Startup, CSS & Network Cleanup

- Giảm app core xuống khoảng 234 KB.
- Giảm CSS bắt buộc xuống khoảng 59 KB.
- Lazy-load CSS theo module.
- Loại dữ liệu demo khỏi runtime production.
- Tách network cache/request runtime dùng chung.


## Phase 8D.3 — Dashboard, Tuition & Evaluation Module Split

- Giảm `app.js` core từ khoảng 553 KB xuống 504 KB.
- Tách Dashboard, runtime Học phí, runtime Đánh giá và helper tạo ảnh báo cáo.
- Thêm audit/smoke test thứ tự dependency cho các module mới.
- Không thay đổi database hoặc nghiệp vụ.

## Phase 8D.2 — Linked Runtime Module Split

- Giảm `app.js` core từ khoảng 663 KB xuống 553 KB.
- Tách runtime Lớp học, Điểm danh, Lịch/Học bù và trang Học bù.
- Thêm audit và smoke test dependency module.
- Không thay đổi database hoặc nghiệp vụ.

## Phase 8D.1 — Core Module Split

- Tách Nhân sự, Cài đặt, Chuyển lớp và runtime Bài tập/Thư viện khỏi `app.js`.
- Nhân sự/Cài đặt chỉ tải khi mở đúng tab; Chuyển lớp chỉ tải khi bấm thao tác.
- Giảm `app.js` bắt buộc lúc mở app từ khoảng 742 KB xuống khoảng 662 KB.
- Giữ nguyên API, database, role Lễ tân, popup điểm danh và nghiệp vụ hiện tại.
- Thêm audit chặn lỗi thứ tự module và phụ thuộc popup.

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

## Phase 8.0
- Chuyển lớp học sinh giữ nguyên hồ sơ và dữ liệu lịch sử.
- Thêm lịch sử lớp, transaction RPC và chống request trùng.
- Xóa tab Điểm danh độc lập; điểm danh chỉ mở từ Lịch dạy.
- Giữ fix badge Lịch dạy và quyền Lễ tân không có Học phí.

## Phase 8B — Interaction & UI Response Performance

- Patch cục bộ thẻ Lịch sau điểm danh/học bù.
- Debounce nháp điểm danh và tối ưu popup giữ scroll.
- Chống bấm lặp cho batch học bù, chống toast trùng.
- Không có migration SQL mới.
