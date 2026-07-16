# Phase 8B — Interaction & UI Response Performance

## Thay đổi chính

- Lưu điểm danh chỉ patch đúng thẻ buổi học trên Lịch dạy, không render lại toàn trang.
- Tick trạng thái và nhập ghi chú điểm danh dùng debounce để tránh ghi localStorage liên tục.
- Popup điểm danh giữ cùng modal shell và vị trí cuộn khi chuyển trạng thái hoặc lưu.
- Xếp/hủy học bù cập nhật đúng các buổi liên quan và chống bấm xác nhận hai lần.
- Toast chống hiển thị trùng; popup chuyển bước không còn fade lại.
- Thêm timing nội bộ trong console cho thao tác vượt ngưỡng 450–500 ms.
- Giữ nguyên nghiệp vụ, quyền role, chuyển lớp, học phí, đánh giá và realtime.

## Database

Không có migration SQL mới.
