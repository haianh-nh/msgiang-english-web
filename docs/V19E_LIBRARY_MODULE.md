# V19E Library Module

Mục tiêu: tách module Thư viện thật cẩn thận, chỉ tách phần render UI trước, không đụng upload/xóa/API.

## Đã làm

1. Tách phần render Thư viện ra file riêng:
   - `public/v15/modules/library.js`

2. Các phần đã chuyển khỏi app core:
   - `filterSelect()`
   - `activeLibraryFiltersText()`
   - `homeworkPage()`
   - `libraryCard()`

3. Các phần cố tình giữ trong app core để an toàn:
   - `ensureExerciseLibrary()`
   - `setLibraryTab()`
   - `setLibrarySearch()`
   - `setLibraryFilter()`
   - `resetLibraryFilters()`
   - `libraryItems()`
   - `openLibraryPreview()`
   - `openWordPreview()`
   - `openLibraryItemModal()`
   - `syncLibraryFileType()`
   - `saveLibraryItem()`
   - `openDeleteLibraryItem()`
   - `deleteLibraryItem()`
   - `refreshOfficialLibrary()`

4. `public/index-v15.html` tải module theo thứ tự:
   - `/v15/modules/classes.js`
   - `/v15/modules/schedule.js`
   - `/v15/modules/attendance.js`
   - `/v15/modules/tuition.js`
   - `/v15/modules/library.js`
   - `/v15/app.js`

## Kết quả

- `public/v15/app.js` trước: 487,279 bytes.
- `public/v15/app.js` sau: 482,355 bytes.
- Module mới: `public/v15/modules/library.js`.

## Không thay đổi

- Không đổi UI/UX.
- Không đổi tab Word/Audio.
- Không đổi filter thư viện.
- Không đổi card tài liệu.
- Không đổi upload file.
- Không đổi xóa tài liệu.
- Không đổi preview Word/Audio.
- Không đổi Supabase Storage/API.
- Không đổi SQL/database.

## Test bắt buộc

1. Mở app chính.
2. Login Admin hoặc Giáo viên.
3. Mở Thư viện.
4. Kiểm tra tab Word/Audio.
5. Tìm tài liệu.
6. Lọc Khối/Kỹ năng/Unit.
7. Bấm Xóa lọc.
8. Bấm Tải lại.
9. Upload thử file Word/Audio nếu cần.
10. Xem trước Word.
11. Mở/tải Audio.
12. Xóa tài liệu thử nếu cần.
13. Reload trang, kiểm tra thư viện vẫn đúng.

## Ghi chú

V19E chỉ tách render UI Thư viện. Toàn bộ upload/delete/preview API vẫn nằm trong app core để tránh rủi ro.
