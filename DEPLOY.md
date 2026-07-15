# Deploy

Dự án được deploy qua GitHub và Vercel.

```bash
npm ci
npm run verify
git add .
git reset .env.local 2>/dev/null
git commit -m "Phase 7J code cleanup and architecture"
git push origin main
```

Không commit `.env.local`, `node_modules`, `.next` hoặc `.git` vào file ZIP triển khai.
## Phase 7K

Trước khi push code, chạy migration:

```text
supabase/migrations/20260715_phase7k_database_query_performance.sql
```

Kiểm tra:

```bash
npm ci
npm run verify
```

