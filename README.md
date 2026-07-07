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


## V9 Login Refresh Fix

- Sửa hiện tượng login xong đôi khi hiện dữ liệu demo cũ như 196 học sinh.
- Login sẽ tải dữ liệu thật trước khi render.


## V9 Class Delete Cleanup Fix

- Xóa lớp sẽ dọn học phí, lịch, điểm danh, vắng/học bù và đánh giá liên quan.
- Frontend gọi API xóa server thật trước, sau đó refresh state từ Supabase.
- Không cần chạy SQL mới.


## V10 Performance Fix

- Login/bootstrap render nhanh hơn.
- Dữ liệu nặng tải nền.
- Các API phụ chạy song song thay vì tuần tự.
- Giảm số lần stringify localStorage và save snapshot.
- Không cần SQL mới.


## V11 Clean Production Lite

- Tách file HTML khổng lồ thành:
  - `/public/index-v11.html`
  - `/public/v11/app.css`
  - `/public/v11/app.js`
  - `/public/v11/favicon.png`
- Trang `/` redirect sang `/index-v11.html`.
- Giữ toàn bộ logic backend/API của V10.
- Mục tiêu: giảm kích thước HTML ban đầu, giúp browser cache CSS/JS tốt hơn và phản hồi mở trang ổn hơn.


## V13 Lazy Load Tabs

- Login/bootstrap chỉ tải dữ liệu lõi và lớp học.
- Lịch, điểm danh, học phí, thư viện, đánh giá, giáo viên chỉ tải khi mở đúng tab.
- Chuyển tháng/tuần sẽ refresh đúng module.
- Không đổi SQL, API, UI workflow hoặc logic nghiệp vụ.


## V14 API + Index Optimization

- Tối ưu query cho lịch/điểm danh theo tuần.
- Tối ưu học phí/đánh giá/thư viện/lớp học bằng cách select cột cần thiết.
- Thêm migration `010_performance_indexes.sql`.
- Không đổi logic nghiệp vụ hoặc UI/UX.


## V15 Module Cache

- Thêm cache theo từng module trong `localStorage`.
- Cache theo user, TTL 10 phút.
- Chuyển tab/reload trong thời gian ngắn sẽ nhanh hơn.
- Không đổi logic nghiệp vụ, UI/UX chính hoặc SQL.


## V16 Next Login + Dashboard

- Thêm `/login` và `/dashboard` bằng Next.js thật.
- Root `/` không còn load thẳng HTML app lớn, mà vào dashboard nhẹ.
- App V15 ổn định vẫn giữ tại `/index-v15.html`, `/app`, `/legacy`.
- Không đổi logic nghiệp vụ hoặc SQL.


## V17 UI Preserve

- Giữ nguyên UI/UX của V16.
- Không dùng trang Classes/Schedule UI mới.
- App đầy đủ vẫn ở `/index-v15.html`, `/app`, `/legacy`.
- Đây là bản rollback an toàn nếu đã test V17 Next Classes + Schedule thấy UI khác yêu cầu.


## V17 Direct Main App Login

- Root `/` và `/login` đi thẳng vào app chính `/index-v15.html`.
- Người dùng thấy login của app chính, không thấy login shell/dashboard trung gian.
- Không cần bấm "Mở app đầy đủ".


## V18A Internal Interaction Performance

- Tối ưu thao tác bên trong app chính.
- Thêm fast index cho class/student.
- Cache các phép tính nặng: học phí, lịch tuần, roster điểm danh.
- Debounce localStorage save để giảm giật UI.
- Không đổi UI/UX, SQL hoặc logic nghiệp vụ.


## V18B Render & DOM Performance

- Giảm render lại modal điểm danh khi tick trạng thái.
- Debounce tìm kiếm lớp/học phí/thư viện.
- Cache filter thư viện và evaluation map theo tháng.
- Không đổi UI/UX, SQL hoặc logic nghiệp vụ.


## V18C Asset Cleanup

- Tách ảnh base64 khỏi `public/v15/app.js`.
- Giảm dung lượng JS khoảng 335.6 KB.
- Ảnh được lưu tại `public/v15/assets/`.
- Không đổi UI/UX, SQL hoặc logic nghiệp vụ.


## V18D Partial Render

- Giữ nguyên sidebar/topbar/bottom nav khi chỉ đổi nội dung trang.
- Chỉ render lại vùng `.page` trong app chính nếu user/role/nav không đổi.
- Có fallback full render khi login/logout/quyền thay đổi.
- Không đổi UI/UX, SQL hoặc logic nghiệp vụ.


## V18E Heavy Table Optimization

- Cache group học phí theo lớp.
- Cache HTML nhóm lớp/lớp đang học-lớp đã học.
- Tối ưu bảng lịch bằng map slot/ngày thay vì filter lặp lại.
- Cache filter values thư viện.
- Không đổi UI/UX, SQL hoặc logic nghiệp vụ.


## V18F Smart Cache Navigation

- Chuyển tuần/tháng theo kiểu cache-first rồi refresh thật.
- Không xóa cache tuần/tháng đã từng xem.
- Cập nhật module cache sau các mutation quan trọng.
- Không đổi UI/UX, SQL hoặc logic nghiệp vụ.


## V18G Network De-duplication

- Gom các GET API trùng nhau đang chạy.
- Thêm short GET cache 1.8 giây cho cùng URL.
- Cache ngắn tự clear sau mutation POST/DELETE/upload.
- Không đổi UI/UX, SQL hoặc logic nghiệp vụ.


## V18H Local State Cleanup

- Compact localStorage chính, không lưu toàn bộ db nặng vào `msgiang_v48_data`.
- Module cache tự prune cache quá hạn và giới hạn 18 key mới nhất.
- Dọn legacy storage của các bản cũ.
- Không đổi UI/UX, SQL hoặc logic nghiệp vụ.


## V18I Background Refresh Control

- Hash payload API để biết dữ liệu có đổi không.
- Không render lại sau refresh nền nếu payload không thay đổi.
- Giảm nháy UI khi cache-first hiển thị trước rồi API trả về cùng dữ liệu.
- Không đổi UI/UX, SQL hoặc logic nghiệp vụ.


## V18J Production Cleanup

- `/dashboard` redirect thẳng về app chính `/index-v15.html`.
- Xóa shell component V16 không còn dùng.
- Xóa file tham chiếu cũ `public/v48-reference.html` khỏi production copy.
- Không đổi UI/UX, SQL hoặc logic nghiệp vụ.


## V19A Classes Module

- Tách render trang Lớp học sang `public/v15/modules/classes.js`.
- Giữ nguyên UI/UX, wording, popup và logic.
- `index-v15.html` load module Lớp học trước app core.
- Đây là bước đầu của V19: tách module thật nhưng không thiết kế lại giao diện.


## V19B Schedule Module

- Tách render trang Lịch dạy sang `public/v15/modules/schedule.js`.
- Giữ nguyên UI/UX, bảng lịch, popup và logic.
- `index-v15.html` load classes module, schedule module rồi app core.
- Đây là bước V19B: tách module thật nhưng không thiết kế lại giao diện.


## V19C Attendance Module

- Tách render trang Điểm danh và modal điểm danh sang `public/v15/modules/attendance.js`.
- Giữ `saveAttendance`, `setAttendanceStatus`, `setAttendanceNote` và logic API trong app core để an toàn.
- Giữ nguyên UI/UX, nút Có mặt/Muộn/Vắng, ghi chú và luồng lưu điểm danh.
- Đây là bước V19C: tách module thật nhưng không thiết kế lại giao diện.


## V19D Tuition Module

- Tách render trang Học phí sang `public/v15/modules/tuition.js`.
- Giữ toàn bộ logic ghi dữ liệu học phí trong app core: đánh dấu đã nộp, bỏ nộp, gửi phụ huynh, tạo ảnh, refresh API.
- Giữ nguyên UI/UX, filter, bảng học phí và wording.
- Đây là bước V19D: tách module thật nhưng không thiết kế lại giao diện.


## V19E Library Module

- Tách render UI Thư viện sang `public/v15/modules/library.js`.
- Giữ upload/xóa/preview/API trong app core để an toàn.
- Giữ nguyên UI/UX, tab Word/Audio, filter và card tài liệu.
- Đây là bước V19E: tách module thật nhưng không thiết kế lại giao diện.


## V19F Evaluation Module

- Tách render UI Đánh giá sang `public/v15/modules/evaluation.js`.
- Giữ logic lưu/chốt/gửi/tạo ảnh/API trong app core để an toàn.
- Giữ nguyên UI/UX, modal, biểu đồ kỹ năng và wording.
- Đây là bước cuối của V19: tách module render trước khi sang V20 lazy-load module theo tab.


## V19F.1 Evaluation Score Smooth

- Sửa việc popup Đánh giá render lại mỗi lần chọn điểm kỹ năng.
- `setEvalScore()` cập nhật biểu đồ, điểm trung bình và nút điểm trực tiếp trong modal.
- Giữ nguyên logic Lưu nháp/Chốt/Gửi/API.


## V19F.2 Evaluation Image Layout

- Sửa bố cục ảnh đánh giá để các ô không chồng chéo.
- Tăng canvas ảnh đánh giá lên 1800x1350.
- Giãn lại 2 cột biểu đồ / nhận xét.
- Giữ nguyên logic lưu/chốt/gửi/API.


## V20A.1 Login core data fix

- Sửa lỗi sau đăng nhập thẻ Lớp học chưa có dữ liệu cho đến khi refresh.
- Login bắt buộc nạp core `classes + teachers` trước khi render.
- Nếu request core đầu tiên chưa ổn định, app tự retry một lần ngắn.
- Không đổi UI/UX và không cần SQL mới.


## V20B Mutation refresh optimization

- Thêm `v20bAfterMutation(keys)` để cập nhật đúng cache/module sau thao tác thêm/sửa/xóa/lưu.
- Tối ưu mutation cho học phí, điểm danh, giáo viên, lớp/học sinh, lịch, học bù, thư viện và đánh giá.
- Bỏ refresh toàn bộ không cần thiết sau khi xóa lớp.
- Không đổi UI/UX, API hay SQL.


## V20B.1 Class makeup refresh fix

- Sửa lỗi xếp lịch dạy bù hiện ngay lúc đầu nhưng mất sau khi refresh.
- `/api/schedule/state` trả về lịch dạy bù theo cả `makeup_date` và `source_session_key` của buổi nghỉ trong tuần đang xem.
- Không đổi UI/UX và không cần SQL mới.


## V20B.2 Class makeup persistence fix

- Sửa tiếp lỗi lịch dạy bù cả lớp bị mất sau refresh.
- `/api/schedule/state` trả về toàn bộ lịch dạy bù active để client tự lọc/ghép theo tuần và buổi nghỉ.
- Thẻ buổi nghỉ hiển thị rõ lịch đã xếp: `Dạy bù: ngày • giờ`.
- Nếu đã xếp, nút đổi thành `Đổi dạy bù`.
- Không cần SQL mới.


## V20B.3 Class makeup merge fix

- Sửa tiếp lỗi lịch dạy bù mất sau refresh bằng cách merge `classMakeupSessions` thay vì replace.
- Bảo vệ dữ liệu local/cache khi API refresh nền trả thiếu trong một thời điểm.
- Thêm cache-bust `?v=20b3` cho app.js và module JS để tránh trình duyệt chạy file cũ do immutable cache.
- Không cần SQL mới.


## V20B.4 Login state reset fix

- Sửa lỗi logout rồi login lại trong cùng tab làm mất tạm dữ liệu dạy bù/lịch cho tới khi refresh.
- Reset toàn bộ `lazyRouteState`, memo và network GET cache khi login/logout.
- Cache-bust JS sang `?v=20b4`.
- Không cần SQL mới.


## V20B.5 Refresh hash reset fix

- Sửa lỗi logout/login lại làm dashboard và Lớp học hiện 0 cho tới khi refresh.
- Reset cả `v18iRefreshHashes` khi login/logout.
- `refreshOfficialClasses()` vẫn apply dữ liệu nếu local đang rỗng nhưng server trả classes/teachers.
- `refreshOfficialScheduleState()` vẫn apply dữ liệu nếu local schedule/makeup đang rỗng nhưng server trả dữ liệu.
- Cache-bust JS sang `?v=20b5`.


## V20B.6 Class makeup teacher assignment

- Popup dạy bù cả lớp có thêm ô chọn giáo viên dạy bù.
- Lưu `teacher_id` cho `official_class_makeup_sessions`.
- Giáo viên được gán có thể thấy buổi dạy bù trong Lịch dạy của mình.
- Có SQL mới: `supabase/migrations/011_class_makeup_teacher.sql`.


## V20B.7 Class makeup teacher visibility fix

- Sửa lỗi giáo viên được chọn dạy bù không thấy buổi dạy bù trong Lịch dạy.
- `/api/schedule/state` trả thêm `classSnapshot` cho buổi dạy bù.
- Frontend merge class snapshot và render dạy bù kể cả khi giáo viên không phải giáo viên chính của lớp.
- Không cần SQL mới so với V20B.6.


## V20B.8 Class makeup API robust fix

- Sửa robust phần API để giáo viên được gán dạy bù nhìn thấy buổi dạy bù.
- `/api/schedule/state` tự build teacher/classSnapshot bằng query riêng, không phụ thuộc embedded relationship.
- `/api/classes` cho giáo viên merge lớp chính + lớp có class makeup được gán, không dùng `.or(id.in(...))`.
- Không cần SQL mới so với V20B.6.


## V20B.8.1 TypeScript fix

- Sửa lỗi build `Property 'name' does not exist on type 'unknown'` trong `app/api/schedule/state/route.ts`.
- Không đổi logic/API/SQL.


## V20B.9 Cache refresh fix

- Sửa lỗi tài khoản giáo viên dùng cache schedule cũ nên không thấy buổi dạy bù mới được Admin gán.
- `ensureRouteData()` bây giờ cache-first nhưng luôn refresh API nền sau khi hydrate cache.
- Không cần SQL mới.


## V20B.10 Server-visible class makeup fix

- Server `/api/schedule/state` tự lọc class makeup theo user hiện tại.
- Teacher nhận buổi dạy bù nếu được gán qua `teacher_id`.
- Frontend hiển thị class makeup theo `visibleToCurrentUser`.
- Không cần SQL mới so với V20B.6.


## V20B.11 Visible makeup direct fix

- Thêm `/api/schedule/class-makeup/visible` để trả trực tiếp buổi dạy bù visible theo user hiện tại.
- Frontend gọi trực tiếp endpoint này khi refresh lịch và merge vào schedule state.
- Bấm Lịch dạy/Điểm danh/Học bù sẽ force tải lại server, không dùng cache cũ.
- Không cần SQL mới so với V20B.6.


## V20B.12 Preserve class time fix

- Sửa lỗi snapshot dạy bù ghi đè `time` của lớp thật làm mất các buổi học thường.
- Merge class snapshot an toàn, không overwrite `time` bằng rỗng.
- Refresh core classes khi visible makeup thay đổi để phục hồi lịch chính.
- Không cần SQL mới.


## V20B.13 Schedule load optimization

- Tối ưu tốc độ vào Lịch dạy sau các fix class makeup.
- Không gọi thêm `/api/schedule/class-makeup/visible` khi vào lịch; `/api/schedule/state` là single source.
- Không force reload mỗi lần bấm Lịch dạy; dùng cache trước rồi refresh nền nếu stale.
- Chỉ invalidate mạnh sau mutation ảnh hưởng lịch.
- Giữ safe merge class snapshot để không làm mất `time` của lớp thật.
- Không cần SQL mới.


## V20B.14 Schedule state schema fix

- Sửa lỗi `/api/schedule/state` 500 do select cột `id` không tồn tại trong `official_session_cancellations`.
- API dùng `session_key` làm khóa buổi nghỉ.
- Không cần SQL mới.


## V20B.15 Assigned teacher only

- Giáo viên chỉ thấy buổi dạy bù cả lớp được gán trực tiếp cho mình.
- Không còn hiện dạy bù của giáo viên khác chỉ vì cùng là giáo viên chính của lớp.
- Admin/Manager vẫn thấy toàn bộ.
- Không cần SQL mới.


## V20B.16 Cancel makeup & reopen session

- Thêm hủy dạy bù cả lớp bằng soft cancel `status = cancelled`.
- Thêm mở lại buổi học đã nghỉ trong popup buổi học.
- Chặn hủy/mở lại nếu buổi dạy bù liên quan đã có điểm danh.
- Không cần SQL mới.


## V20B.17 Schedule actions popup only

- Ẩn các nút thao tác ngoài thẻ lịch.
- Chuyển nút Xếp học bù, Cho nghỉ, Xếp/Đổi/Hủy dạy bù, Mở lại buổi học vào popup khi bấm vào lớp.
- Giữ nguyên logic/API/database.
- Không cần SQL mới.


## V20B.18 Teacher schedule freshness fix

- Lịch dạy giáo viên refresh nền cả `/api/classes` và `/api/schedule/state`.
- Khi server không còn trả dạy bù, local cũng xóa theo, không giữ dữ liệu cũ.
- Lớp ended/inactive/cancelled/deleted không render trên lịch.
- `/api/classes` cho teacher chỉ trả lớp active/status null.
- Không cần SQL mới.


## V20B.19 Keyboard UX shortcuts

- Enter để đăng nhập.
- Enter để lưu ở form ngắn/popup khi focus input/select.
- Esc để đóng popup.
- Ctrl/Cmd + Enter để lưu popup khi đang gõ textarea.
- Không đổi API/database/logic nghiệp vụ.


## V20C Smart Background Prefetch

- Tải nền thông minh 1–2 route liên quan sau khi trang hiện tại đã load.
- Không đổi route, không đổi UI, không đổi nghiệp vụ.
- Không prefetch khi đang mở popup.
- Không render lại trang hiện tại do dữ liệu prefetch.
- Không cần SQL mới.


## V20D Skeleton Loading & Reduce Flicker

- Thêm skeleton loading theo từng loại trang.
- Giảm nháy bằng cách không render lại innerHTML khi nội dung page không đổi.
- Không đổi API/database/logic nghiệp vụ.
- Không cần SQL mới.


## V20E Local Cache & Save Optimization

- Debounce và dedupe ghi `msgiang_v48_data`.
- Batch module cache writes.
- Flush cache an toàn khi pagehide/beforeunload/ẩn tab.
- Route save không ghi trùng.
- Không đổi API/database/logic nghiệp vụ.
- Không cần SQL mới.


## V20E.1 End class persistence fix

- `Kết thúc lớp` PATCH status `ended` lên server.
- Lớp chuyển xuống `Lớp đã học` sau khi kết thúc.
- `Mở lại lớp` PATCH status `active` lên server.
- Kết thúc lớp không xóa điểm danh/học phí/đánh giá; chỉ xóa khi dùng `Xóa lớp`.
- Không cần SQL mới.


## V20E.2 Transfer class persistence fix

- `Chuyển lớp` ghi lên server thay vì chỉ push local.
- Tạo lớp mới qua `/api/classes`.
- Copy học sinh được chọn sang lớp mới qua `/api/classes/:id/students`.
- Kết thúc lớp cũ qua PATCH status `ended`.
- Dữ liệu lớp cũ vẫn giữ cho tới khi xóa lớp.
- Không cần SQL mới.


## V20E.3 Class persistence hard fix

- Bỏ `updated_at` khỏi PATCH official_classes để tránh lỗi schema.
- Thêm `/api/classes/transfer` xử lý chuyển lớp server-side.
- Sau kết thúc/mở lại/chuyển lớp, refresh lại `/api/classes` và apply response đã xác nhận từ server.
- Xóa snapshot `official_v48_state` cũ sau class lifecycle.
- Không cần SQL mới.


## V20E.4 Evaluation send status only

- Đổi `Chốt/Gửi` thành `Gửi`.
- Bấm `Gửi` chỉ đổi trạng thái sang `published`, giao diện hiện `Đã gửi`.
- Không link/create account phụ huynh, không gửi thông báo/SMS/Zalo.
- Không cần SQL mới.


## V20I/J Mobile + API Slim

- `/api/schedule/state` chỉ lấy class makeup trong tuần đang xem khi có start/end.
- CSS fine tune cho iPhone/iPad: modal, bảng, nút bấm, form, đánh giá học sinh, bottom nav.
- Không thêm bảng database, không cần SQL.
- Không đổi logic nghiệp vụ.


## V20J.1 Mobile UI hardening

- CSS-only hardening for phone/iPad.
- Fixes likely horizontal overflow, bottom nav with many items, modal layout, form/button stacking, evaluation rows/charts, and table scrolling.
- No business logic/API/database changes.


## V20J.2 Mobile logout button

- Hiện lại nút đăng xuất trên mobile/iPad.
- Màn nhỏ thu gọn thành icon để không làm vỡ topbar.
- CSS-only, không đổi logic/API/database.


## V20K Monthly Material Fee + Word Support

- Thêm tiền học liệu theo từng học sinh / từng tháng.
- Tổng cần đóng = học phí buổi + học liệu + nợ cũ.
- Nợ cũ tính cả học liệu tháng trước nếu chưa đóng.
- Thêm popup `Sửa học liệu` trong trang Học phí.
- Thư viện Word hiển thị rõ `.doc` và `.docx`.
- Cần chạy SQL: `supabase/migrations/20260703_v20k_monthly_material_fee.sql`.


## V20L Free Makeup Placement

- Học bù xếp tự do vào bất kỳ buổi Chưa dạy, không bắt buộc cùng khối.
- Popup xếp học bù có ô tìm theo tên/lớp/buổi vắng.
- Backend chặn xếp vào buổi đang dạy/đã dạy và lớp đã kết thúc/hủy.
- Không cần SQL.


## V20L.1 PDF library upload fix

- Restore PDF upload support in exercise library.
- Supports Word (.doc/.docx), PDF, Audio.
- Adds PDF tab, PDF preview, and backend validation.
- Requires running `supabase/migrations/20260703_v20l1_restore_pdf_library_upload.sql` in Supabase.


## V20L.2 Attendance Override & Absence Display Fix

- Admin/Manager can take attendance early and edit closed attendance.
- Teachers can save only from 15 minutes before class to 23:59.
- Saving attendance fills default `present` rows for students not manually changed.
- Absence records sync correctly when changing `absent` back to present/late.
- Scheduled makeup absences are protected: cancel makeup first before changing absence.
- No SQL required.


## V20L.3 Makeup UI & Data Fix

- Makeup tab now loads both schedule and attendance/absence state.
- Shows pending makeup absences and scheduled makeup plans separately.
- Schedule popup makeup placement uses mobile-friendly card UI with search.
- No SQL required.


## V20L.4 Schedule absence count live update

- Schedule page now fetches attendance/absence state too.
- Lesson cards show `Vắng: x` as soon as attendance is saved, not only after the lesson status becomes `Đã dạy`.
- Saving attendance invalidates schedule memo/cache and updates the schedule behind the modal.
- Closing the attendance popup reveals the updated absent count immediately.
- No SQL required.


## V20M Edit Active Class Only

- Adds class editing from the Classes screen.
- Only active classes can be edited.
- Ended classes are locked in UI and backend for class editing/student mutation/transfer/class deletion.
- Validates duplicate active class names, schedule duplicates, and future makeup conflicts before changing schedule.
- Adds class note support to the class payload.
- No SQL required.

## V20N TA Role & Class Assignment

- Adds `ta` role for teaching assistants.
- Adds `official_classes.assistant_teacher_id` to link TA accounts to classes.
- TA can see assigned classes and use attendance, makeup placement, evaluations, and library.
- TA cannot access tuition/admin/class-management actions.
- Class create/edit/transfer forms now select TA from staff accounts.
- Requires SQL migration: `supabase/migrations/20260704_v20n_ta_role_assignment.sql`.


## V20N.1 TA Role Assignment Hardening

- Blocks assign/unassign teacher/TA on ended classes in UI and backend.
- Blocks deleting staff assigned to ended classes to preserve historical class records.
- Clears TA local cache when deleting staff from active classes.
- Prevents selecting the same person as main teacher and TA.
- Keeps parent in official role constraint for compatibility.


## V20N.2 Table Contrast UI Fix

- Improves table header/body text contrast across `.tableWrap`, `.modalTableWrap`, and `.modalTable`.
- Fixes pale table headers with white text in Tuition and similar screens.
- Keeps `.timetable` schedule design unchanged.
- No SQL required.


## V20N.3 Tuition UI & Payment Message Optimization

- Optimizes tuition table layout and wording.
- Merges excused/unexcused absence display into one tuition-table absence column without changing billing logic.
- Adds copy button to parent tuition message modal.
- Adds Techcombank payment information to tuition text and generated tuition image.
- No SQL required.


## V20O — Prepaid Monthly Tuition

- Changes tuition calculation to prepaid monthly mode.
- Tuition is now based on planned class sessions in the month.
- Student personal absences do not reduce tuition; they remain in makeup workflow.
- Admin/Manager class cancellations create tuition credits for next month.
- Reopening a cancelled session cancels the related tuition credits.
- Adds `official_tuition_credits` migration.


## V20O.1 Build Fix

- Fixes TypeScript build error in `/api/tuition/state/route.ts` around `materialUpdatedAt`, `materialUpdatedBy`, and `creditItems`.
- No SQL changes beyond V20O.


## V20O.2 — Tuition Performance & UX Polish

- Hydrates tuition cache by selected month before refreshing.
- Adds busy states to tuition and class cancellation buttons.
- Updates tuition row locally for material fee changes and refreshes in background.
- Adds sticky tuition table header / student column and class collapse controls.
- Adds safe performance indexes for tuition status, credits, and cancellations.
