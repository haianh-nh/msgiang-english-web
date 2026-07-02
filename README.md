# Ms.Giang English Official Backend V5

Bản này giữ UI **Official V48 Port Clean** đã duyệt và nối phần nền thật:

1. Auth đăng nhập thật
2. Role thật: admin / manager / teacher
3. Settings thật:
   - học phí mặc định 70.000đ/buổi
   - giới hạn 15 học sinh/buổi
4. Database schema chính thức nền
5. API đọc/ghi dữ liệu nền

## Chạy local

```bash
npm install
npm run dev
```

Mở:

```text
http://localhost:3000
```

## Supabase

Chạy SQL:

```text
supabase/migrations/001_official_backend_v1.sql
```

Sau đó seed admin:

```bash
node --env-file=.env.local scripts/seed-admin.mjs
```

Tài khoản mặc định:

```text
admin / 123456
```

## API đã có

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `GET /api/bootstrap`
- `GET /api/settings`
- `POST /api/settings`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users`
- `GET /api/v48-state`
- `POST /api/v48-state`

## Ghi chú

Bản này là Backend V1 nền. Sau khi test đăng nhập/role/settings ổn, bước sau mới nối từng module nghiệp vụ:
Classes + Import, Schedule + Attendance + Makeup, Tuition, Teachers, Library, Evaluations, Notifications.


## Backend V2 added

- Classes API thật.
- Students API thật.
- Import lớp/học sinh từ CSV/XLS/XLSX.
- UI lớp học gọi API thật khi tạo lớp/thêm học sinh/xóa học sinh/import file.

## Migration cần chạy thêm

```text
supabase/migrations/002_classes_import.sql
```


## Template import fix

- Nút **Tải file mẫu Excel** tải file `public/import-template.xlsx`.
- Vẫn giữ `public/import-template.csv` cho trường hợp cần CSV.
- Nếu mở CSV trực tiếp trên trình duyệt thì trình duyệt sẽ hiển thị chữ thô; đó là hành vi bình thường của file CSV.


## Backend V4 added

- Lịch dạy tuần / trạng thái buổi học / hủy buổi / dạy bù cả lớp.
- Xếp học bù từ lịch.
- Điểm danh theo buổi lưu thật vào Supabase.
- Tự sinh danh sách học bù từ học sinh vắng.
- Kiểm tra giới hạn sĩ số chính thức + học bù theo setting `session_capacity`.

## Migration cần chạy thêm

```text
supabase/migrations/003_schedule_makeup.sql
supabase/migrations/004_attendance_absences.sql
```

## Clean UI note

- Đã bỏ card demo `UX v48` và nút `Reset` ở sidebar.


## Backend V5 added

- Học phí thật theo điểm danh.
- Lọc học phí theo tháng.
- Đơn giá lấy từ Settings, mặc định 70.000đ/buổi.
- Trạng thái đã nộp / đã gửi phụ huynh lưu thật vào Supabase.
- Học phí tự refresh sau khi lưu điểm danh.

## Migration cần chạy thêm

```text
supabase/migrations/005_tuition_real.sql
```

## V5 Tuition UI fix

- Sửa bộ lọc tháng học phí thành chọn tháng + nhập năm.
- Sửa spacing để chữ trong khu vực học phí không dính vào nhau.

## V5 Month Fix

- Sửa lỗi đổi tháng nhưng học phí vẫn lấy dữ liệu tháng cũ/toàn bộ thời gian.
- Tháng chưa học/không có điểm danh sẽ hiển thị học phí 0đ.

## V5 Arrears Fix

- Cộng công nợ tháng trước chưa nộp vào tháng sau.
- Ảnh gửi phụ huynh có breakdown phát sinh tháng này / nợ cũ / tổng cần đóng.


## Backend V6 added

- Quản lý giáo viên/tài khoản thật.
- Phân quyền Admin / Quản lí / Giáo viên bằng UI mới.
- Reset mật khẩu giáo viên.
- Gán/bỏ gán lớp cho giáo viên.
- Giáo viên chỉ thấy lớp được phân công qua `/api/classes`.

## Migration cần chạy thêm

```text
supabase/migrations/006_teacher_permissions.sql
```


## V6 UI/account fix

- Sửa UI đổi mật khẩu.
- Bỏ badge cần đổi mật khẩu ở card giáo viên.
- Thêm xóa giáo viên/tài khoản liên quan.
- Cài đặt tài khoản liên kết với danh sách giáo viên/nhân viên.

## Remove notifications

- Bỏ menu Thông báo và chuông thông báo khỏi UI official.
- Không cần chạy SQL mới.

## Schedule session popup

- Bấm vào lớp trên thời khóa biểu để xem danh sách lớp, học bù và học sinh vắng.
- Không cần chạy SQL mới.


## Backend V7 added

- Thư viện bài tập PDF/Audio thật.
- Upload file lên Supabase Storage.
- Metadata lưu trong `official_exercise_library`.
- Xem PDF / nghe Audio trực tiếp.
- Admin/Quản lí xóa tài liệu và file Storage.

## Migration cần chạy thêm

```text
supabase/migrations/007_exercise_library_storage.sql
```

## V7 blank screen fix

- Sửa lỗi màn hình trắng do thiếu helper filter của Thư viện bài tập.
- Không cần chạy SQL mới.


## V7 Word Fix

- Thư viện bài tập đổi từ PDF sang Word (.doc/.docx).
- Audio giữ nguyên.
- Nếu đã chạy migration 007 trước đó, chạy thêm:

```text
supabase/migrations/008_exercise_library_word_fix.sql
```

## V7 Word UI Fix

- Sửa lỗi bấm Thư viện bài tập/Cài đặt không phản hồi.
- Không cần SQL mới.


## V7 Simple Word Preview

- Tối giản UI card thư viện.
- Thêm xem trước file `.docx` bằng `mammoth`.
- Sau khi cập nhật cần chạy:

```bash
npm install
```

để cài dependency `mammoth`.


## Backend V8 added

- Đánh giá học sinh thật lưu Supabase.
- Đánh giá theo tháng.
- Giáo viên chỉ đánh giá học sinh lớp mình dạy.
- Admin/Quản lí xem toàn bộ.
- Ảnh đánh giá đã tối ưu chữ nhỏ hơn và chú thích tiếng Việt.

## Migration cần chạy thêm

```text
supabase/migrations/009_evaluations_real.sql
```


## Backend V9 added

- Health check production.
- Backup JSON.
- Dọn session hết hạn.
- UI Production & Backup trong Cài đặt.
- Frontend chống trắng trang khi một page render lỗi.
- Rà soát normalize dữ liệu cũ.

## API mới

```text
GET  /api/health
GET  /api/backup/export
POST /api/maintenance/clear-expired-sessions
```

Không cần chạy SQL mới nếu V8 đã chạy đủ tới migration 009.


## V9 Security Login Fix

- Form đăng nhập không còn tự điền `admin` / `123456`.
- Tắt đăng nhập nhanh ở production.
- Thêm khối đổi mật khẩu tài khoản trong Cài đặt.
