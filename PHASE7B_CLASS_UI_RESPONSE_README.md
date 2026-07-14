# Phase 7B — Class UI Response Optimization

Build marker: `20phase7bclassui`

## Scope

This phase changes only the frontend response flow for the **Classes** tab. No database migration is required.

## Improvements

- Add student: closes the modal after server success and patches only the affected class card.
- Edit class: patches local state and the class list without rebuilding the full tab.
- Delete student: updates the roster modal and class count locally.
- Create, transfer, end, delete, and import classes: refresh only `#classList`, preserving search and page scroll.
- All save/delete/import buttons use a shared busy state and reject duplicate clicks.
- A modal cannot be closed while its mutation request is running.
- API success is separated from UI patch errors. A UI error never reports the server mutation as failed.
- Shared Store is patched for `core`; schedule, attendance, tuition, evaluation, and makeup caches are invalidated only when relevant.
- Server revalidation runs in the background after 5 seconds with `renderOnRevalidate: false`.
- The sender tab suppresses its own Realtime echo using the existing Phase 6 mutation tracking.
- Official state is saved locally without posting an extra full `/api/v48-state` snapshot.

## Validation

- `node --check public/v15/app.js`
- `node --check public/v15/modules/classes.js`
- `npm run build`
- Next.js build: 37/37 routes generated successfully.
