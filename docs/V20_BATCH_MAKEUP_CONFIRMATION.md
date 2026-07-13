# V20 Batch Makeup Confirmation

## UI flow

1. The `Đã xếp trong buổi này` table is shown above `Chờ xếp`.
2. Selecting a pending student only adds that absence to an in-memory draft.
3. One or many draft students can be selected.
4. Draft rows are marked `Chưa xác nhận` and can be removed with `Bỏ chọn`.
5. `Xác nhận N học sinh` writes all draft rows in one atomic database transaction.
6. Closing the popup with unconfirmed rows asks before discarding them.

## Database migration

Run `supabase/migrations/015_makeup_batch_confirmation.sql` in Supabase SQL Editor before using multi-select confirmation.

The function `official_schedule_makeup_plans_batch` validates capacity, duplicate students, pending absence status, deleted months and existing plans. Any validation failure rolls back the full batch.

## Backward compatibility

The existing single-plan API payload remains supported. A one-item batch can fall back to the Phase 2 single RPC if migration 015 has not been installed. Multi-item confirmation requires migration 015.
