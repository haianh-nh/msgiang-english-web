#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$HOME/Downloads/msgiang-new-test/msgiang-english-web-main}"
PRODUCTION_BRANCH="${2:-main}"

if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  echo "Không tìm thấy Git project tại: $PROJECT_DIR" >&2
  exit 1
fi

cd "$PROJECT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Project đang có thay đổi chưa commit. Hãy commit hoặc lưu lại trước khi deploy." >&2
  git status --short
  exit 1
fi

git switch "$PRODUCTION_BRANCH"
git pull --rebase origin "$PRODUCTION_BRANCH"

SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
rsync -av \
  --exclude='.env.local' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  "$SOURCE_DIR/" "$PROJECT_DIR/"

grep -n "20phase6rt2" public/index-v15.html
grep -n "window.msgiangRealtime" public/v15/app.js
grep -n "20phase6rt2" public/v15/realtime-bootstrap.js

npm run build

git add .
git reset .env.local 2>/dev/null || true
if git diff --cached --quiet; then
  echo "Không có thay đổi để commit. Dừng để tránh redeploy nhầm bản." >&2
  exit 1
fi

git commit -m "Redeploy Phase 6 Realtime v2"
git push origin "$PRODUCTION_BRANCH"

echo "Đã push Phase 6 Realtime v2 lên branch $PRODUCTION_BRANCH"
echo "Build marker: 20phase6rt2"
