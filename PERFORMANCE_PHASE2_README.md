# Performance Phase 2 — Backend/API

This build keeps the current UI and business rules, but reduces Supabase round trips for the Makeup workflow.

## What changed

- Added atomic Supabase RPC for scheduling one makeup plan.
- Added atomic Supabase RPC for cancelling one makeup plan.
- Added one-call monthly Makeup state RPC.
- Added one-call Makeup month list RPC.
- Added targeted indexes for makeup/attendance queries.
- Parallelized independent reads in `/api/schedule/state`.
- Added a 60-second in-process cache for `official_settings`.
- Added `Server-Timing` response headers to key APIs for performance measurement.
- Kept legacy API fallbacks, so the app still works before migration 014 is installed.

## Required Supabase step

Run this file once in Supabase SQL Editor:

`supabase/migrations/014_makeup_performance_rpc.sql`

Without this migration the application falls back to the old query flow, so the new speed improvement will not be fully active.

## APIs expected to improve

- `POST /api/makeup/plans`
- `DELETE /api/makeup/plans/:id`
- `GET /api/makeup/state?month=YYYY-MM`
- `GET /api/makeup/months`
- `GET /api/schedule/state?start=...&end=...`

## Safety

- No attendance/history rows are deleted.
- Scheduling and cancellation RPCs are transactional.
- Capacity checks for the same target session are serialized with a transaction advisory lock.
- The API automatically falls back to the legacy implementation if migration 014 has not been run.

## Retest

Export another HAR after deployment and compare:

1. Open the makeup popup.
2. Schedule one student.
3. Cancel one scheduled makeup.
4. Switch Schedule → Makeup → Attendance.

Check the `Server-Timing` tab/response header to separate total API time from database RPC time.
