# V14 API + Index Optimization

Mục tiêu: tăng tốc từng tab sau V13 lazy-load mà không đổi logic nghiệp vụ.

## Thay đổi backend

1. `/api/schedule/state`
   - Nhận `start` / `end`.
   - Chỉ tải nghỉ buổi và dạy bù lớp trong tuần đang xem.
   - Makeup plans chỉ trả các plan chưa bị huỷ.
   - Select cột cần thiết thay vì `*`.

2. `/api/attendance/state`
   - Nhận `start` / `end`.
   - Chỉ tải attendance sessions và rows trong tuần đang xem.
   - Absence records chỉ tải trạng thái `pending` để phục vụ xếp học bù.
   - Select cột cần thiết thay vì `*`.

3. `/api/tuition/state`
   - Giữ nguyên logic tính học phí/công nợ.
   - Select cột cần thiết thay vì `*`.

4. `/api/evaluations`
   - Admin/Manager không cần query danh sách tất cả class id trước khi lấy đánh giá.
   - Giáo viên vẫn giới hạn theo class được phân công.
   - Select cột cần thiết thay vì `*`.

5. `/api/library`
   - Select cột cần thiết thay vì `*`.

6. `lib/classes.ts`
   - API lớp học chỉ lấy các cột UI thật sự dùng.

## SQL

Chạy migration:

`supabase/migrations/010_performance_indexes.sql`

Migration này chỉ thêm index, không sửa/xóa dữ liệu.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi học phí.
- Không đổi điểm danh.
- Không đổi học bù.
- Không đổi phân quyền.
- Không đổi schema dữ liệu nghiệp vụ.
