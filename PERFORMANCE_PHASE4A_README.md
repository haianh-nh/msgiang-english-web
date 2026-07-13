# Performance Phase 4A

Phase 4A continues the frontend optimization work without changing Supabase tables, RPC functions, or business rules.

## Changes

1. **Parallel initial loading**
   - `/api/classes`, `/api/schedule/state`, and `/api/attendance/state` can start together.
   - The schedule no longer waits for the classes request to finish before beginning its own state requests.

2. **Trailing mutation revalidation**
   - Scheduling or cancelling makeup students patches the local state from the mutation response immediately.
   - Server reconciliation runs only after the user has stopped making changes.
   - Consecutive cancellations are coalesced into one trailing refresh.
   - Revalidation requests never run in parallel.

3. **Longer class-data reuse**
   - Class data is reused for up to five minutes.
   - Local class/teacher/student mutations still invalidate the class cache immediately through the existing mutation manager.

4. **No automatic tuition preload from Schedule or Attendance**
   - Tuition data loads when the Tuition tab is opened.
   - This removes an expensive background request when the user never opens Tuition.

## Deployment

No SQL migration is required.

After deployment, the main script cache version is `20perf4a`.

## Recommended HAR test

Record these actions in one HAR file:

1. Open Schedule from a cold reload.
2. Schedule one or more makeup students.
3. Cancel three makeup students consecutively.
4. Wait eight seconds.
5. Switch Schedule → Attendance → Schedule.

Expected observations:

- The initial classes, schedule, and attendance requests begin at nearly the same time.
- No `/api/tuition/state` request appears unless Tuition is opened.
- Consecutive makeup cancellations produce one delayed `/api/schedule/state` reconciliation request instead of one request per cancellation.
- `/api/classes` is not repeatedly fetched during normal route switching inside the five-minute cache window.
