import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`✓ ${message}`);
const expect = (condition, message) => (condition ? pass(message) : fail(message));

const build = '20phase7j-code-cleanup-architecture';
const index = read('public/index-v15.html');
const app = read('public/v15/app.js');
const css = read('public/v15/app.css');
const auth = read('lib/auth.ts');
const nextConfig = read('next.config.mjs');
const deployment = JSON.parse(read('public/deployment-version.json'));
const pkg = JSON.parse(read('package.json'));

expect(index.includes(`<meta name="msgiang-build" content="${build}"`), 'Build marker đúng trong index-v15.html');
expect(index.includes(`/v15/modules/ui-runtime.js?v=${build}`), 'UI runtime dùng chung được nạp');
expect(index.indexOf('modules/ui-runtime.js') < index.indexOf('/v15/app.js'), 'UI runtime được nạp trước app.js');
expect(nextConfig.includes(build), 'Build marker đúng trong next.config.mjs');
expect(/cpus:\s*2/.test(nextConfig), 'Build giới hạn worker để ổn định trên máy/Vercel');
expect(deployment.build === build && deployment.phase === '7j-code-cleanup-architecture', 'deployment-version.json đồng bộ');

expect(css.includes('.staffStatusDot{'), 'Trạng thái nhân sự dùng class riêng');
expect(!css.includes('.statusDot{display:inline-block;width:8px;height:8px'), 'Không còn rule nhân sự đè statusDot của Lịch dạy');
expect(/\.statusDot\{[^}]*white-space:nowrap/.test(css), 'Badge trạng thái Lịch dạy luôn nằm ngang');
expect(/\.classMakeupBadge\{[^}]*white-space:nowrap/.test(css), 'Badge Học kèm/Dạy bù luôn nằm ngang');
expect(!css.includes('PHASE 7I SCHEDULE BADGE FIX'), 'Đã gộp bản vá CSS tạm vào rule chính');

expect(app.includes("const isReceptionist = () => hasRole('receptionist')"), 'Frontend vẫn nhận role Lễ tân');
expect(app.includes("const canViewTuition = () => isAdmin() || isManager()"), 'Lễ tân vẫn bị tách khỏi quyền Học phí');
expect(app.includes("if(r==='tuition' && !canViewTuition())"), 'Route Học phí vẫn được bảo vệ');
expect(app.includes('receptionistAccountsForTeachersPage'), 'Trang nhân sự vẫn hiển thị Lễ tân');
expect(auth.includes('"receptionist"'), 'Backend auth vẫn khai báo role Lễ tân');

expect(app.includes('window.MsUiAction.beginModalAction'), 'Popup dùng utility action chung');
expect(app.includes('window.MsUiAction.beginLockedAction'), 'Nhân sự dùng khóa thao tác chung');
expect(!app.includes('function teacherRoleLegend()'), 'Đã xóa hàm hướng dẫn role không còn sử dụng');

const versionValues = [
  ...index.matchAll(/v=(20phase[^"']+)/g)
].map((match) => match[1]);
expect(versionValues.length > 0 && versionValues.every((value) => value === build), 'Toàn bộ asset query version đồng bộ');

const packageVersions = {
  ...pkg.dependencies,
  ...pkg.devDependencies
};
expect(Object.values(packageVersions).every((value) => value !== 'latest' && !String(value).includes('*')), 'Dependency đã khóa phiên bản cụ thể');

if (process.exitCode) {
  console.error('\nPhase 7J audit thất bại. Không nên deploy.');
  process.exit(process.exitCode);
}
console.log('\nPhase 7J audit đạt.');
