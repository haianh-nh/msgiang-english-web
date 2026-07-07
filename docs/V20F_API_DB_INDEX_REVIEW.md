# V20F — API/Database Index Review

## Mục tiêu

Tối ưu các truy vấn đang dùng nhiều nhất trong app:

- Lớp học
- Lịch dạy
- Điểm danh
- Học bù / dạy bù
- Đánh giá học sinh
- Học phí
- Teacher/parent lookup

## Thay đổi trong bản này

Bản này thêm migration SQL:

```text
supabase/migrations/20260703_v20f_performance_indexes.sql
```

File này chứa các index gợi ý cho Supabase/Postgres.

## Cách chạy

Vào Supabase:

```text
Project → SQL Editor → New query
```

Copy toàn bộ nội dung file:

```text
supabase/migrations/20260703_v20f_performance_indexes.sql
```

Sau đó bấm `Run`.

## An toàn dữ liệu

File SQL dùng:

```sql
CREATE INDEX IF NOT EXISTS ...
```

Nên:

- không xóa dữ liệu,
- không đổi cấu trúc bảng,
- không rename cột,
- không đổi logic app,
- nếu index đã có thì bỏ qua.

## Những phần được tối ưu

### 1. Classes

Tối ưu query theo:

- teacher_id,
- status,
- grade,
- class_id của học sinh.

### 2. Schedule

Tối ưu query theo:

- session_key,
- class_id + session_date,
- teacher_id + status + makeup_date,
- source_session_key.

### 3. Attendance

Tối ưu query theo:

- session_date,
- session_key,
- class_id + session_date,
- student_id.

### 4. Absence / Makeup

Tối ưu query theo:

- status,
- student_id,
- source_class_id,
- target_class_id,
- target_session_key.

### 5. Evaluations

Tối ưu query theo:

- month_key,
- class_id,
- student_id + month_key,
- status,
- updated_at.

### 6. Tuition

Tối ưu query theo:

- student_id + month_key,
- month_key + paid.

## Không thay đổi

- Không đổi frontend UI.
- Không đổi API behavior.
- Không đổi database data.
- Không đổi logic lịch học/kết thúc lớp/chuyển lớp/đánh giá.
- Không cần deploy lại nếu chỉ chạy SQL.

## Ghi chú

Nếu chạy SQL xong mà Supabase báo một cột không tồn tại, dừng lại và chụp lỗi.  
Lúc đó cần kiểm tra schema thực tế rồi bỏ index tương ứng.
