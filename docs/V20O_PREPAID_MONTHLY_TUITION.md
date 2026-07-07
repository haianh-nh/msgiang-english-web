# V20O — Prepaid Monthly Tuition & Next-Month Credit

## Logic chính

- Học phí thu trước theo tháng.
- Học phí tháng này = số buổi dự kiến trong tháng × đơn giá/buổi.
- Học sinh nghỉ cá nhân không khấu trừ học phí; các lượt đó chỉ đi vào tab Học bù.
- Chỉ Admin/Quản lí được cho nghỉ lớp.
- Khi Admin/Quản lí cho nghỉ lớp, hệ thống tạo khoản khấu trừ cho tháng sau cho từng học sinh trong lớp.
- Khi mở lại buổi đã cho nghỉ, hệ thống hủy khoản khấu trừ tháng sau phát sinh từ buổi đó.
- Cột Khấu trừ ở UI chỉ hiện số tiền.

## UI học phí

Bảng học phí đổi sang:

- Học sinh
- Buổi dự kiến
- Đơn giá
- Học phí tháng
- Học liệu
- Nợ cũ
- Khấu trừ
- Tổng
- Trạng thái
- Gửi
- Thao tác

Không dùng Có mặt/Muộn/Học bù/Vắng để tính học phí nữa.

## SQL bắt buộc

Chạy migration:

`supabase/migrations/20260704_v20o_prepaid_monthly_tuition_credits.sql`

## Ghi chú

Bản này cần chạy sau V20N.3/V20N.1 vì dùng role TA, khóa lớp đã kết thúc và bảng học liệu tháng.
