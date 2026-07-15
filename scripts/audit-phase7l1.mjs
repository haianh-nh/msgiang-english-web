import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`✓ ${message}`);
const expect = (condition, message) => condition ? pass(message) : fail(message);

const build = '20phase7l1-smart-warmup-fast-tabs';
const index = read('public/index-v15.html');
const app = read('public/v15/app.js');
const css = read('public/v15/app.css');
const warmup = read('public/v15/smart-warmup.js');
const staffApi = read('app/api/staff/overview/route.ts');
const auth = read('lib/auth.ts');
const deployment = JSON.parse(read('public/deployment-version.json'));
const pkg = JSON.parse(read('package.json'));

expect(index.includes(`<meta name="msgiang-build" content="${build}"`), 'Build marker đúng');
expect(index.includes(`/v15/smart-warmup.js?v=${build}`), 'Smart warm-up được nạp đúng version');
expect(index.indexOf('/v15/app.js') < index.indexOf('/v15/smart-warmup.js'), 'Warm-up nạp sau app bridge');
expect(deployment.build === build, 'deployment-version đồng bộ');
expect(app.includes("window.MsAppWarmupBridge=Object.freeze"), 'App cung cấp warm-up bridge an toàn');
expect(warmup.includes("['teachers', 'homework', 'evaluation', 'tuition']"), 'Admin/Manager có kế hoạch warm-up tab nặng');
expect(warmup.includes("route === 'tuition' && !api.canViewTuition()"), 'Warm-up không vượt quyền Học phí');
expect(warmup.includes('connection.saveData'), 'Tôn trọng Save-Data');
expect(warmup.includes("document.visibilityState === 'hidden'"), 'Không preload nền khi tab ẩn');
expect(warmup.includes("closest('[data-route]')"), 'Menu intent warm-up hoạt động');
expect(app.includes('v7l1RouteLoadWaiters'), 'Request preload/open tab dùng chung và có waiter');
expect(app.includes("officialFetch('/api/staff/overview')"), 'Frontend dùng API nhân sự gộp');
expect(staffApi.includes('Promise.all'), 'API nhân sự tải dữ liệu song song');
expect(staffApi.includes('canAdmin(user)'), 'Chỉ Admin nhận danh sách tài khoản');
expect(app.includes('requestIdleCallback(commit'), 'Local cache serialize khi trình duyệt rảnh');
expect(css.includes('.staffStatusDot{'), 'Class trạng thái nhân sự vẫn tách riêng');
expect(/\.statusDot\{[^}]*white-space:nowrap/.test(css), 'Badge Lịch dạy vẫn một hàng');
expect(app.includes("const isReceptionist = () => hasRole('receptionist')"), 'Role Lễ tân vẫn tồn tại');
expect(app.includes("const canViewTuition = () => isAdmin() || isManager()"), 'Lễ tân không có quyền Học phí');
expect(auth.includes('"receptionist"'), 'Backend vẫn nhận role Lễ tân');
expect(pkg.scripts.audit.includes('audit-phase7l1'), 'Package chạy đúng audit mới');

if (process.exitCode) {
  console.error('\nPhase 7L.1 audit thất bại. Không nên deploy.');
  process.exit(process.exitCode);
}
console.log('\nPhase 7L.1 audit đạt.');
