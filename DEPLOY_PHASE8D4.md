# Deploy Phase 8D.4

Không cần chạy SQL.

```bash
cd ~/Downloads
rm -rf msgiang-phase8d4-src
mkdir msgiang-phase8d4-src
unzip msgiang-english-web-phase8d4-startup-css-network-cleanup.zip -d msgiang-phase8d4-src
rsync -av --delete \
  --exclude='.env.local' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  msgiang-phase8d4-src/msgiang-english-web-phase8d4-startup-css-network-cleanup/ \
  msgiang-new-test/msgiang-english-web-main/
cd ~/Downloads/msgiang-new-test/msgiang-english-web-main
npm ci
npm run verify
git add .
git reset .env.local 2>/dev/null
git commit -m "Phase 8D4 optimize startup CSS and network runtime"
git push origin main
```
