# V20B.8 — Class makeup API robust fix

## Vấn đề

Dữ liệu Supabase đã đúng:
- `official_class_makeup_sessions.teacher_id` có giá trị,
- `official_teachers.id` khớp đúng tài khoản giáo viên,
nhưng giáo viên được gán vẫn chưa thấy buổi dạy bù trong Lịch dạy.

## Nguyên nhân khả dĩ

Luồng V20B.7 còn phụ thuộc vào embedded relationship của Supabase/PostgREST để trả teacher/class snapshot trong `/api/schedule/state`, và phụ thuộc `.or(id.in(...))` trong `/api/classes`.

Trong thực tế, các embedded relationship/schema cache hoặc cú pháp `.or(...id.in...)` có thể không trả đúng như mong đợi, làm frontend không có class snapshot hoặc không có lớp liên quan để render buổi dạy bù.

## Đã sửa

### `/api/schedule/state`

Không dùng nested embedded select cho class makeup nữa. API tách rõ:

1. Lấy toàn bộ `official_class_makeup_sessions` active.
2. Lấy teacher theo `teacher_id`.
3. Lấy class theo `class_id`.
4. Lấy students theo `class_id`.
5. Tự build `classSnapshot` thủ công.

### `/api/classes`

Với tài khoản giáo viên:

1. Query lớp giáo viên chính phụ trách.
2. Query `official_class_makeup_sessions` được gán cho giáo viên.
3. Query thêm các lớp có buổi dạy bù đó.
4. Merge 2 danh sách lớp thủ công.

Không còn dùng `.or(id.in(...))`.

## Không thay đổi

- Không cần SQL mới so với V20B.6.
- Không đổi UI.
- Không đổi thao tác xếp dạy bù.
