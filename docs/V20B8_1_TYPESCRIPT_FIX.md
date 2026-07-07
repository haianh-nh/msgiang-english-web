# V20B.8.1 — TypeScript fix

## Vấn đề

Next.js build lỗi:

`Property 'name' does not exist on type 'unknown'`

tại file:

`app/api/schedule/state/route.ts`

## Nguyên nhân

`teacherMap` trong API schedule state được TypeScript suy luận là `Map<string, unknown>`, nên khi đọc `teacher?.name` build không pass type check.

## Đã sửa

- Khai báo rõ kiểu `teacherMap` là `Map<string, any>`.
- Cast biến `teacher` tại nơi sử dụng.
- Cache-bust JS sang `?v=20b81`.

## Không thay đổi

- Không đổi logic.
- Không đổi SQL.
- Không đổi UI.
