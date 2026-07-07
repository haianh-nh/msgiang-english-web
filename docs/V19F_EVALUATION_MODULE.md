# V19F Evaluation Module

Mục tiêu: hoàn tất giai đoạn V19 bằng cách tách module Đánh giá thật cẩn thận, chỉ tách phần render UI, không đụng logic lưu/API.

## Đã làm

1. Tách phần render Đánh giá ra file riêng:
   - `public/v15/modules/evaluation.js`

2. Các phần đã chuyển khỏi app core:
   - `evaluationMonthPanel()`
   - `evaluationPage()`
   - `evaluationMapForCurrentMonth()`
   - `evaluationGroupCard()`
   - `monthScoreData()`
   - `weeklyEvaluationData()`
   - `parentOverallScoreboard()`
   - `parentDetailedEvaluationPanel()`
   - `openEvalModal()`
   - `renderEvalStudent()`
   - `evalDetail()`
   - `evalViewContent()`
   - `evalEditForm()`
   - `skillNameVI()`
   - `skillShortVI()`
   - `skillBarChart()`
   - `radarSvg()`
   - `scoreButtons()`

3. Các phần cố tình giữ trong app core để an toàn:
   - `setEvalScore()`
   - `saveEvaluation()`
   - `sendEvaluationToParent()`
   - `openEvaluationImage()`
   - `evaluationImageData()`
   - `refreshOfficialEvaluations()`
   - `ensureEvaluation()`
   - `evalAverage()`

4. `public/index-v15.html` tải module theo thứ tự:
   - `/v15/modules/classes.js`
   - `/v15/modules/schedule.js`
   - `/v15/modules/attendance.js`
   - `/v15/modules/tuition.js`
   - `/v15/modules/library.js`
   - `/v15/modules/evaluation.js`
   - `/v15/app.js`

## Kết quả

- `public/v15/app.js` trước: 482,355 bytes.
- `public/v15/app.js` sau: 471,229 bytes.
- Module mới: `public/v15/modules/evaluation.js`.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi màn Đánh giá.
- Không đổi modal Đánh giá.
- Không đổi biểu đồ kỹ năng.
- Không đổi nút Lưu nháp / Chốt/Gửi / Tạo ảnh.
- Không đổi logic lưu đánh giá.
- Không đổi ảnh đánh giá.
- Không đổi Supabase/API.
- Không đổi SQL/database.

## Test bắt buộc

1. Mở app chính.
2. Login Admin hoặc Giáo viên.
3. Mở Đánh giá.
4. Kiểm tra danh sách lớp/học sinh giống bản trước.
5. Mở modal Đánh giá của một học sinh.
6. Bấm Chỉnh sửa.
7. Đổi điểm 1–5.
8. Nhập nhận xét.
9. Bấm Lưu nháp.
10. Mở lại và bấm Chốt/Gửi.
11. Bấm Tạo ảnh.
12. Đổi tháng đánh giá rồi quay lại.
13. Reload trang, kiểm tra dữ liệu đánh giá vẫn đúng.

## Ghi chú

V19F chỉ tách render UI Đánh giá. Toàn bộ mutation/API vẫn nằm trong app core để tránh rủi ro sai dữ liệu.
