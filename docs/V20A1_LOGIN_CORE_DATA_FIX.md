# V20A.1 — Login core data fix

## Vấn đề

Sau khi đăng nhập ở V20A, một số lần trang "Lớp học" chưa có dữ liệu ngay. Người dùng phải refresh trình duyệt thì dữ liệu lớp mới hiện.

Nguyên nhân có khả năng là luồng tối ưu V20A render app quá sớm trong lúc core data `classes + teachers` chưa nạp ổn định ngay sau khi cookie đăng nhập được set.

## Đã sửa

1. Sau login, app bắt buộc nạp `core data` trước khi render.
2. Nếu request core đầu tiên lỗi hoặc chưa có lớp, app chờ ngắn rồi thử lại một lần.
3. Nếu `/api/classes` lỗi, core không bị đánh dấu là `loaded` giả nữa.
4. Sau login dùng `ensurePageData(route)` thay vì chỉ `ensureRouteData(route)`.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi logic nghiệp vụ.
- Không đổi database/SQL.
- Không đổi quyền tài khoản.
