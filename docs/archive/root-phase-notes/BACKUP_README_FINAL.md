# Ms.Giang English Web — Final backup (Học bù optimized)

Bản backup này là bản đã gộp toàn bộ các chỉnh sửa phần **Học bù / Xếp học bù / Điểm danh học bù / Reset theo tháng / Tối ưu tốc độ**.

## Bản này bao gồm

- Source code Next.js đầy đủ.
- API backend trong thư mục `app/api`.
- Frontend static app trong `public/v15`.
- SQL/migrations Supabase trong `supabase/migrations`.
- API tối ưu riêng cho tab Học bù: `app/api/makeup/state/route.ts`.
- Migration tối ưu index học bù theo tháng: `supabase/migrations/012_makeup_month_performance_indexes.sql`.
- Các patch/changelog trong thư mục `_backup_notes` và `patches`.

## Bản này KHÔNG chứa

- File `.env.local` thật.
- `SUPABASE_SERVICE_ROLE_KEY` thật.
- Dữ liệu rows đang sống trong Supabase database.
- `node_modules` và `.next` build cache.

Muốn backup dữ liệu thật trong Supabase, cần export thêm từ Supabase Dashboard hoặc từ API backup/export của app nếu đang đăng nhập.

## Logic Học bù đã chốt

### 1. Học sinh vắng buổi chính

- Tạo 1 lượt vắng gốc.
- Trạng thái ban đầu: `Chờ xếp`.
- 1 buổi nghỉ = 1 lượt cần học bù.
- Nếu một học sinh nghỉ 2 buổi trong tuần/tháng thì có 2 lượt học bù độc lập.

### 2. Xếp học bù

- Khi xếp học sinh vào buổi học bù, tạo `makeupPlan` trạng thái `scheduled`.
- Học sinh xuất hiện trong popup buổi học bù ở mục Học bù.
- Sĩ số buổi học gồm học sinh chính thức + học sinh học bù đang active.

### 3. Điểm danh học bù Có mặt/Muộn

- `makeupPlan` chuyển `completed`.
- Tab Học bù không còn hiện ở Chờ xếp.
- Bảng Đã học bù hiển thị: ai, vắng buổi nào, học bù vào buổi nào.
- Popup buổi học bù vẫn giữ lịch sử Đã học bù.

### 4. Điểm danh học bù Vắng

- `makeupPlan` chuyển `cancelled` do học bù vắng thật.
- Lượt vắng gốc quay lại `Chờ xếp` để xếp buổi khác.
- Không tạo thêm lượt nghỉ mới.
- Popup buổi học bù cũ vẫn hiển thị học sinh đó là Vắng học bù để lưu lịch sử.

### 5. Admin sửa điểm danh gốc bị nhầm

Ví dụ giáo viên A đánh nhầm học sinh B vắng, sau đó đã xếp học bù, rồi phát hiện B thật ra Có mặt:

- Giáo viên thường không được tự sửa thẳng nếu lượt vắng đã được xếp học bù.
- Admin/Quản lí được phép sửa điểm danh gốc từ Vắng sang Có mặt/Muộn.
- Hệ thống tự hủy lịch học bù phát sinh từ lượt vắng sai.
- Xóa lượt vắng gốc.
- Không đưa học sinh về Chờ xếp.
- Không hiển thị là Vắng học bù.
- Không tính vào sĩ số học bù của buổi đã xếp nhầm.

### 6. Hiển thị Vắng trên card Lịch dạy

- Card lịch dạy hiển thị tổng vắng trong buổi: vắng chính + vắng học bù.
- Popup bên trong vẫn phân biệt rõ học sinh chính thức vắng và học sinh học bù vắng.

### 7. Reset theo tháng

- Tab Học bù chỉ hiển thị dữ liệu của tháng hiện tại/ tháng đang xử lý.
- Sang tháng mới, danh sách Học bù tự sạch theo tháng mới.
- Lịch sử tháng cũ vẫn còn trong Lịch dạy/Điểm danh để xem lại ai vắng, ai học bù, trạng thái nào.
- Không xóa dữ liệu lịch sử khỏi database.

## API mới quan trọng

```text
GET /api/makeup/state?month=YYYY-MM
```

API này trả dữ liệu đã lọc theo tháng cho tab Học bù, giúp giao diện tải nhanh hơn và tránh lọc rộng ở frontend.

## Chạy local trên MacBook

```bash
cd ~/Downloads/msgiang-english-web-main
npm install
nano .env.local
```

File `.env.local` mẫu:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SESSION_DAYS=14
```

Seed admin:

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=123456 npm run seed:admin
```

Chạy local:

```bash
npm run dev
```

Mở:

```text
http://localhost:3000
```

## Deploy Vercel

Cần set Environment Variables trên Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SESSION_DAYS=14
```

Sau đó deploy bình thường.

## SQL tối ưu cần chạy trên Supabase

Có sẵn trong:

```text
supabase/migrations/012_makeup_month_performance_indexes.sql
sql/SUPABASE_MAKEUP_INDEXES.sql
```

Chạy trong Supabase SQL Editor trước/hoặc sau deploy đều được.

## Ghi chú bảo mật

Không commit `.env.local` và không đưa `SUPABASE_SERVICE_ROLE_KEY` lên frontend/public.
Nếu service role key từng bị gửi qua chat hoặc lộ ra ngoài, nên rotate/regenerate key trong Supabase và cập nhật lại trên Vercel.
