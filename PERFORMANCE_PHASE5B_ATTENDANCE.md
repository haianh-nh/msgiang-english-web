# Performance Phase 5B — Attendance Fast Save

## What changed

- Removes tuition refresh/invalidation from the attendance save flow.
- Keeps unsaved attendance clicks local instead of writing the legacy `/api/v48-state` snapshot.
- Adds a busy state to prevent duplicate attendance submissions.
- Applies the attendance response directly to local state and the Phase 5 shared week store.
- Revalidates schedule/attendance in the background after the UI has already confirmed success.
- Invalidates only affected makeup months.
- Adds `official_save_attendance_fast(...)`, which saves attendance, absence records and linked makeup status changes in one PostgreSQL transaction.
- Keeps the previous API implementation as a fallback when migration 018 is missing.
- Adds `Server-Timing` and `X-Attendance-Mode` response headers.

## Required migration

Run:

`supabase/migrations/018_attendance_fast_save_rpc.sql`

Successful attendance responses should contain:

```json
{
  "ok": true,
  "mode": "rpc-fast"
}
```

The response header should contain:

```text
x-attendance-mode: rpc-fast
```

## Validation completed

- `node --check public/v15/app.js`
- `node --check public/v15/modules/attendance.js`
- PostgreSQL syntax parsed successfully with `pglast`
- `npm run build` completed successfully, including TypeScript and 36 static pages
