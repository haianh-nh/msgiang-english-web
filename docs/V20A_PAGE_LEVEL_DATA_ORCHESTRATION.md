# V20A — Page-level data orchestration

## Mục tiêu
- Giữ nguyên logic và UI/UX hiện tại.
- Giảm cảm giác chậm khi vào app và khi chuyển trang.
- Chỉ tải dữ liệu đúng với trang đang mở.

## Thay đổi chính
1. **Bootstrap nhẹ hơn**
   - `/api/bootstrap` chỉ trả snapshot nhẹ cho phần UI/filter local state.
   - Không trả cả payload nặng của state cũ.

2. **Core classes orchestration**
   - Thêm lớp điều phối `core` cho dữ liệu nền tảng: `classes + teachers`.
   - Dữ liệu core được cache riêng bằng key `classes:latest`.
   - Khi có cache, app render sớm rồi refresh nền.
   - Khi chưa có cache, app tải core trước rồi mới vào trang.

3. **Page-level orchestration**
   - Thêm `ensurePageData(route)` để điều phối:
     - `ensureCoreData()`
     - `ensureRouteData(route)`
   - Các nút đổi trang và reload trang dùng chung luồng này.

4. **Refresh theo trang hiện tại**
   - `refreshOfficialDataInBackground()` chỉ refresh đúng dữ liệu trang hiện tại.
   - `refreshCurrentRouteData()` cũng dùng orchestration mới.

## Kỳ vọng hiệu quả
- Vào lại app nhanh hơn nếu đã có cache.
- Giảm parse dữ liệu snapshot không cần thiết.
- Chuyển trang ổn định hơn vì dữ liệu được load theo route.

## Không thay đổi
- Không đổi logic nghiệp vụ.
- Không đổi UI/UX đã chốt.
- Không đổi quyền, workflow, popup, form.
