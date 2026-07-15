# Phase 7I — Runtime & Realtime Stability

Build: `20phase7i-runtime-realtime-stability`

- Removed unconditional 30-second schedule re-render.
- Realtime events are merged while the browser tab is hidden and flushed once after resume.
- Mutation refreshes are deferred while hidden and run once after resume.
- Runtime refreshes update only the active page area; tuition/evaluation use their narrow DOM patchers first.
- Realtime and mutation work remain serialized; no parallel trailing refreshes.
- Direct npm dependencies are pinned to the versions already tested in `package-lock.json`.
- No Supabase migration is required.
