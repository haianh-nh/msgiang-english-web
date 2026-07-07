# V20N.3 — Tuition UI & Payment Message Optimization

## Bảng học phí

- Gộp 2 cột `Vắng CP` và `Vắng KP` thành 1 cột `Vắng` ở giao diện bảng học phí.
- Dữ liệu gốc vẫn giữ riêng vắng có phép / vắng không phép; chỉ gộp hiển thị vì cả hai đều không tính học phí.
- Cột `Học liệu` tách thành 2 dòng: số tiền và nút `Sửa học liệu`.
- Đổi `Tổng cần đóng` thành `Tổng`.
- Đổi `Gửi / Ảnh PH` thành `Gửi`.
- Đổi nút `Chốt/Gửi` thành `Gửi`.
- Căn lại các cột, nút và badge để bảng thoáng hơn trên desktop/iPad/mobile.

## Popup gửi học phí phụ huynh

- Thêm nút `Copy` để copy toàn bộ nội dung thông báo học phí.
- Thêm thông tin chuyển khoản vào nội dung gửi và ảnh học phí:

```text
Thông tin chuyển khoản:
Ngân hàng Techcombank Hà Thành
STK: 4246388338
CTK: CAO HUONG GIANG
```

## SQL

Không cần SQL mới.
