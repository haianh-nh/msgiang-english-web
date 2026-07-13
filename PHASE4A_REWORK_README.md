# Performance Phase 4A rework — confirm additions and cancellations together

## Popup behavior

- Selecting one or more pending students only stages additions (`Chờ thêm`).
- Clicking `Hủy` on a saved makeup student only stages cancellation (`Chờ hủy`).
- `Hoàn tác` removes a staged cancellation.
- `Lưu thay đổi` applies all staged additions and cancellations in one database transaction.
- Closing the popup with unsaved changes asks for confirmation.

## Required migration

Run `supabase/migrations/016_makeup_confirm_add_cancel_changes.sql` in Supabase SQL Editor before deploying the code.

Verification:

```sql
select to_regprocedure(
  'public.official_apply_makeup_plan_changes(jsonb,jsonb,text,text,uuid,integer)'
) as makeup_changes_rpc;
```

The result must not be `null`.

## API verification

After saving changes in the popup, `POST /api/makeup/plans` should return:

```json
{
  "ok": true,
  "mode": "rpc-changes"
}
```
