# Deploy Phase 8D.3

```bash
npm ci
npm run verify
git add .
git reset .env.local 2>/dev/null
git commit -m "Phase 8D3 split dashboard tuition and evaluation modules"
git push origin main
```
