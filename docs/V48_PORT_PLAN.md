# V48 Port Plan

Bản này dùng cách an toàn nhất để đảm bảo giao diện giống V48: phục vụ nguyên file HTML V48 trong Next.js.

## Vì sao làm như vậy?

Các bản V3/V4/V5 trước là rebuild nên bị lệch UI, popup và workflow. 
Bản này giữ nguyên HTML/CSS/JS của V48, nên UI là bản đối chiếu chuẩn.

## Những URL quan trọng

- `/` → redirect sang `/index-v48-port.html`
- `/index-v48-port.html` → bản UI đang chạy
- `/v48-reference.html` → file demo V48 gốc để so sánh
- `/import-template.csv` → mẫu import lớp/học sinh

## Lưu ý

Bản này chưa phải backend hoàn chỉnh. Đây là bước đúng để nghiệm thu UI 1:1.
Sau khi UI được duyệt, backend sẽ được nối phía sau từng modal/action.
