# V20D — Skeleton Loading & Reduce Flicker

## Mục tiêu

Tối ưu cảm giác tải trang sau V20C, không đổi logic nghiệp vụ.

## Đã làm

### 1. Skeleton loading

Thay màn hình loading dạng block bằng skeleton phù hợp:

- Lịch dạy / Học bù: skeleton dạng thời khóa biểu.
- Điểm danh / Học phí / Đánh giá / Giáo viên: skeleton dạng bảng.
- Các trang còn lại: skeleton dạng thẻ/card.

### 2. Giảm nháy khi render lại

`v18dRenderPageOnly()` không set lại `innerHTML` nếu nội dung không đổi.  
Điều này giúp giảm nháy khi:

- background refresh không đổi dữ liệu,
- lịch tự render lại theo timer,
- prefetch hoặc cache refresh không làm thay đổi trang hiện tại.

### 3. Animation rất nhẹ

Chỉ thêm shimmer nhẹ cho skeleton và fade rất nhỏ khi page đổi nội dung.  
Có hỗ trợ `prefers-reduced-motion`.

## Không thay đổi

- Không đổi API.
- Không đổi database.
- Không đổi UI layout chính.
- Không đổi logic lịch học/học bù/dạy bù/điểm danh.
- Không cần SQL mới.
