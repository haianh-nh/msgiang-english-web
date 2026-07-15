# Performance Phase 3 — Frontend response optimization

This phase keeps the Phase 2 RPC/API behavior unchanged and optimizes the browser-side flow.

## Changes

1. **Schedule renders without waiting for monthly makeup data**
   - The Schedule page now waits only for classes (when stale), schedule state, and attendance state.
   - Monthly makeup state is preloaded in the background after the page is usable.

2. **Makeup popup preloading**
   - Visible week month(s) are preloaded and held in memory for 60 seconds.
   - Opening “Xếp học bù” uses the prefetched snapshot immediately when available.
   - Requests for the same month are deduplicated.

3. **Fewer repeated `/api/classes` requests**
   - Route refreshes reuse recently loaded core/class data for 20 seconds.
   - A forced page refresh still reloads classes normally.

4. **Optimistic local mutation patching**
   - Batch scheduling and cancellation use API responses to patch local state immediately.
   - Schedule and makeup caches are updated instead of being deleted wholesale.
   - Only related GET cache entries are invalidated.
   - A delayed background revalidation confirms server state without replacing the popup UI.

5. **No backend or SQL changes**
   - Migration 014 and 015 remain unchanged.
   - No new migration is required for this phase.

## Suggested verification

- Open Schedule and confirm the page appears before `/api/makeup/state` finishes.
- Open “Xếp học bù” after the schedule has loaded; the popup should normally appear immediately.
- Confirm 1 or several students; the popup and schedule count should update immediately.
- Cancel a makeup plan; the student should return to “Chờ xếp” immediately.
- In DevTools Network, repeated navigation should show fewer `/api/classes` calls.
