# V20K — Monthly Material Fee + Word File Support

## Mục tiêu

Thêm 2 yêu cầu mới:

1. Mỗi học sinh có tiền học liệu riêng theo từng tháng.
2. Thư viện bài tập hỗ trợ rõ cả 2 định dạng Word: `.doc` và `.docx`.

## Học phí / tiền học liệu

### Công thức mới

```text
Tổng cần đóng = Học phí buổi học + Tiền học liệu tháng này + Nợ cũ
```

Trong đó:

```text
Học phí buổi học = số buổi tính phí × đơn giá / buổi
Tiền học liệu = khoản riêng theo studentId + monthKey
Nợ cũ = các tháng trước chưa đóng, gồm cả học phí buổi + học liệu
```

### UI mới

Trang Học phí có thêm:

- cột `Học phí buổi`,
- cột `Học liệu`,
- cột `Nợ cũ`,
- cột `Tổng cần đóng`,
- nút `Sửa học liệu` cho từng học sinh.

### Database

Bản này thêm cột vào bảng hiện có `official_tuition_status`:

```text
material_fee
material_note
material_updated_at
material_updated_by
```

Không tạo bảng mới để giữ database nhẹ.

## Thư viện bài tập

- `.doc` và `.docx` đều được gộp là loại `word`.
- Giao diện hiển thị badge rõ `Word .DOC` hoặc `Word .DOCX`.
- File `.docx` vẫn xem trước bằng text preview.
- File `.doc` cũ không preview trực tiếp, nhưng vẫn mở/tải được.

## Cần chạy SQL

Chạy file:

```text
supabase/migrations/20260703_v20k_monthly_material_fee.sql
```

trong Supabase SQL Editor trước khi dùng tính năng học liệu.

## Không thay đổi

- Không đổi logic điểm danh.
- Không đổi logic lớp/lịch/chuyển lớp/kết thúc lớp.
- Không tách thanh toán học phí và học liệu; `Đã nộp` nghĩa là đã nộp tổng cả tháng.
