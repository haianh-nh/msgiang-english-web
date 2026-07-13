# Performance Phase 4B

Phase 4B is based on the stable Phase 4A change-confirmation build.

## Changes

- The Schedule tab always opens on the current Vietnam week.
- `/api/schedule/state` uses `official_get_schedule_week_state(...)` after migration 017.
- Weekly cancellations, class makeup sessions, student makeup plans, source absences, attendance sessions and pending absences are returned in one database round trip.
- The Schedule page no longer calls `/api/attendance/state` when the Phase 4B RPC is active.
- Existing legacy API behavior remains as a safe fallback until migration 017 is installed.
- Exact date expression indexes replace the old many-`LIKE` week filtering for makeup plans and absence records.
- Concurrent identical schedule requests are coalesced in the same warm server process without serving stale data.
- `Server-Timing` now includes `auth`, `rpc`, `transform` and `total`.

## Required migration

Run:

`supabase/migrations/017_schedule_week_state_rpc.sql`

Verify:

```sql
select
  to_regprocedure('public.official_session_key_date(text)') as session_key_date_helper,
  to_regprocedure('public.official_get_schedule_week_state(date,date,uuid,text,boolean)') as schedule_week_rpc;
```

Both columns must be non-null.

## Browser verification

Open DevTools > Network and open Schedule.

Expected response from `/api/schedule/state?...`:

```json
{
  "ok": true,
  "mode": "rpc-week",
  "attendanceBundled": true
}
```

Expected headers:

- `x-schedule-mode: rpc-week`
- `server-timing: auth;dur=...,rpc;dur=...,transform;dur=...,total;dur=...`

When the RPC is active, opening Schedule should not create a separate `/api/attendance/state` request. The Attendance tab remains compatible with both the bundled RPC and the legacy fallback.
