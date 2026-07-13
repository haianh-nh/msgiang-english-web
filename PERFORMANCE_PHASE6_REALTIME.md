# Performance Phase 6 — Cross-device Realtime Sync

## Scope

- Supabase Realtime Broadcast invalidation between authenticated app sessions.
- Shared Store entries are marked stale without blanking the current UI.
- Active screens refresh in the background after an 850 ms debounce.
- Open modals are protected: incoming refreshes wait until the modal closes.
- Local writes are recognized for 5 seconds to avoid an immediate duplicate refresh on the sender.
- Reconnect logic resumes after temporary WebSocket errors or returning to the tab.

## Security model

The database broadcasts only cache scopes, table name, operation, and timestamp. It never broadcasts student names, phone numbers, attendance rows, tuition values, or other business payloads.

The service-role key remains server-only. The browser uses a Supabase publishable key (or legacy anon key) and receives the channel topic only from the authenticated `/api/realtime/config` endpoint.

## Required setup

1. Run `supabase/migrations/019_realtime_shared_store_sync.sql` in Supabase SQL Editor.
2. Add one browser-safe key in Vercel:
   - preferred: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - legacy fallback: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redeploy.

## Verify

After login, run in DevTools Console:

```js
msgiangRealtime.status()
```

Expected:

```js
{ status: 'subscribed', ... }
```

Open the app on two devices. Save attendance or makeup changes on device A. Device B should refresh the affected active screen automatically without a page reload.

## Safe disable / rollback

Realtime can be disabled without removing triggers:

```sql
update public.official_realtime_config
set enabled = false, updated_at = now()
where id = 1;
```

Re-enable with `enabled = true`.
