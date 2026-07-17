# Deploy Phase 8D.2

Build: `20phase8d2-linked-runtime-module-split`

Không có migration SQL mới.

```bash
npm ci
npm run verify
git add .
git reset .env.local 2>/dev/null
git commit -m "Phase 8D2 split linked runtime modules"
git push origin main
```
