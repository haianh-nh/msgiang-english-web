# V20J.2 — Mobile logout button

## Vấn đề

Trên mobile, nút `Thoát` đang bị ẩn bởi CSS để tiết kiệm chỗ trên topbar.

## Đã sửa

Bản này chỉ sửa CSS:

- Hiện lại nút đăng xuất trên mobile/iPad.
- Ở màn hình vừa, nút hiển thị dạng `↩ Thoát`.
- Ở màn hình rất nhỏ, nút thu gọn thành icon `↩` để không chen giao diện.
- Không đổi logic đăng xuất vì nút vẫn dùng `onclick="logout()"` sẵn có.

## Không thay đổi

- Không đổi database.
- Không đổi API.
- Không đổi logic app.
- Không cần SQL.
