# V17 Direct Main App Login

Bản này xử lý đúng yêu cầu: vào thẳng login của app chính.

## Thay đổi

- `/` redirect thẳng về `/index-v15.html`.
- `/login` cũng redirect về `/index-v15.html`.
- `/app` và `/legacy` vẫn redirect về `/index-v15.html`.
- Không hiện trang login Next.js shell nữa.
- Không cần bấm nút "Mở app đầy đủ" sau khi đăng nhập.

## Không thay đổi

- Không đổi SQL.
- Không đổi database.
- Không đổi logic nghiệp vụ.
- Không đổi app chính V15.
- Không sửa autofill mật khẩu.
- Dashboard V16 nếu còn truy cập thủ công `/dashboard` thì vẫn có thể dùng, nhưng không phải luồng mặc định.
