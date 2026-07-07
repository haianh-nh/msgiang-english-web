# V7 Word UI Fix

Sửa lỗi bấm vào `Thư viện bài tập` và `Cài đặt` không phản hồi:

- Khôi phục các helper `accountLinkedRows`, `accountRoleLabel`, `accountRoleClass` cho trang Cài đặt/Tài khoản.
- Thư viện tự chuyển dữ liệu cũ `pdf` sang `word` trong local state.
- Thư viện tự chuyển tab cũ `pdf` sang `word`.
- Thêm render error boundary để nếu trang nào lỗi sẽ hiện thông báo thay vì trắng/không phản hồi.

Không cần chạy SQL mới nếu đã chạy `008_exercise_library_word_fix.sql`.
