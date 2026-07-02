# Import template fix

Vấn đề: khi bấm link CSV, trình duyệt có thể mở file CSV như văn bản thô.

Đã sửa:
- Thêm file mẫu Excel: `public/import-template.xlsx`
- Đổi nút trong UI sang `href="/import-template.xlsx"` và thêm thuộc tính `download`
- Backend import vẫn hỗ trợ CSV/XLS/XLSX

Cột mẫu:
- class_name
- teacher_name
- schedule_1_day
- schedule_1_start
- schedule_1_end
- schedule_2_day
- schedule_2_start
- schedule_2_end
- student_name
- parent_phone
- note
