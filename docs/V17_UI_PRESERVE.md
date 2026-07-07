# V17 UI Preserve

Bản này dùng lại nền V16 ổn định và KHÔNG thay đổi UI/UX người dùng.

## Mục tiêu

- Giữ nguyên Dashboard V16.
- Giữ nguyên cách mở app V15 đầy đủ.
- Không thêm trang Lớp học/Lịch dạy mới có giao diện khác.
- Chuẩn bị hướng V17B/V18 về sau: khi tách module phải clone UI hiện tại trước, không thiết kế lại.

## Không thay đổi

- Không đổi SQL.
- Không đổi logic học phí.
- Không đổi logic điểm danh.
- Không đổi logic học bù.
- Không đổi logic thư viện/đánh giá.
- Không đổi dashboard.
- Không đổi autofill mật khẩu.

## Vì sao có bản này?

Bản V17 Next Classes + Schedule trước đó tạo trang `/classes` và `/schedule` với UI mới.
Điều đó không đúng yêu cầu "giữ nguyên UI/UX như V16", nên bản này rollback về đúng UI V16.
