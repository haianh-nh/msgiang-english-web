# V11 Clean Production Lite

Đây là bước tối ưu production an toàn: chưa viết lại toàn bộ UI sang React component để tránh phá logic,
nhưng đã tách single HTML lớn thành asset riêng.

## Thay đổi

- `/public/index-v48-port.html`: chỉ còn redirect giữ tương thích link cũ.
- `/public/index-v11.html`: HTML shell nhẹ hơn.
- `/public/v11/app.css`: toàn bộ CSS.
- `/public/v11/app.js`: toàn bộ JS.
- `/public/v11/favicon.png`: favicon tách khỏi base64 head.

## Không thay đổi

- Không đổi Supabase schema.
- Không đổi API.
- Không đổi logic tính học phí, điểm danh, học bù, đánh giá.
- Giữ các fix V9/V10 trước đó.

## Lợi ích

- HTML ban đầu nhỏ hơn rất nhiều.
- Browser cache CSS/JS riêng.
- Lần mở sau nhanh hơn.
- Dễ tiếp tục tách từng module sang React ở V12+.
