# Vercel build fix: stale files

Nếu Vercel báo lỗi `canTuition was not found`, nguyên nhân thường là project local còn sót file cũ không còn nằm trong bản V9.

Các file/folder cũ hay gây lỗi:

- `app/(app)/`
- `app/api/tuition/mark-paid/`
- `app/api/tuition/update-status/`

Cách sạch nhất là xóa folder `app` trong project hiện tại rồi rsync lại bản V9.

```bash
cd ~/Downloads/msgiang-english-web-v1

rm -rf app
rm -rf .next

rsync -av \
  --exclude='.git' \
  --exclude='.env.local' \
  --exclude='node_modules' \
  --exclude='.next' \
  ~/Downloads/msgiang-v9-deploy-fix/msgiang-english-official-backend-v9-deploy-fix/ \
  ~/Downloads/msgiang-english-web-v1/

npm install
npm run build

git add .
git commit -m "Fix stale app files for Vercel deploy"
git push
```
