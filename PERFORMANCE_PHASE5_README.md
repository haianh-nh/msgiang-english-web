# Performance Phase 5 — Shared Frontend Store

Phase 5 adds one in-memory data store shared by the front-end modules while preserving the existing local module cache as a fast startup fallback.

## What changed

- One logical store entry for core class data.
- One shared week bundle for Schedule and Attendance.
- One store entry per Makeup month.
- Shared entries for Tuition, Library, Evaluation, Teachers and Settings.
- Concurrent loaders for the same logical key are deduplicated.
- Fresh entries are reused immediately when switching tabs.
- Stale entries render first and revalidate in the background.
- Mutation responses patch the affected store scopes immediately.
- Non-optimistic mutations invalidate only the affected scopes.
- Generation guards prevent an older in-flight response from overwriting a newer optimistic mutation.
- Schedule and Attendance now consume the same week snapshot, preventing cross-tab state drift.

## Store TTLs

- Classes/core: 5 minutes
- Schedule + Attendance week: 15 seconds
- Makeup month: 60 seconds
- Tuition: 60 seconds
- Library: 5 minutes
- Evaluation month: 2 minutes
- Teachers and settings: 5 minutes

## Debugging

In the browser console:

```js
msgiangSharedStore.stats()
msgiangSharedStore.keys()
```

The debug object exposes only store statistics and key names, not the stored student data.

## Deployment

No SQL migration is required. Run the normal production build and deploy the updated source.
