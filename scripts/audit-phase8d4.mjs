import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const size = (file) => fs.statSync(path.join(root, file)).size;
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`✓ ${message}`);
const expect = (condition, message) => condition ? pass(message) : fail(message);

const build = '20phase8d4-startup-css-network-cleanup';
const index = read('public/index-v15.html');
const app = read('public/v15/app.js');
const loader = read('public/v15/module-loader.js');
const network = read('public/v15/network-runtime.js');
const coreCss = read('public/v15/app.css');
const scheduleCss = read('public/v15/styles/schedule.css');
const auth = read('lib/auth.ts');
const deployment = JSON.parse(read('public/deployment-version.json'));
const pkg = JSON.parse(read('package.json'));

const requiredModules = {
  'public/v15/modules/dashboard.js': ['overview', 'quickTodos', 'notifications'],
  'public/v15/modules/report-images.js': ['openGeneratedImageModal', 'drawCanvasText'],
  'public/v15/modules/tuition.js': ['tuitionPage', 'markPaid', 'openTuitionImage', 'v7fPatchTuitionVisibleDom'],
  'public/v15/modules/evaluation.js': ['evaluationPage', 'saveEvaluation', 'openEvaluationImage', 'v7fIsEvaluationDirty'],
  'public/v15/modules/classes-runtime.js': ['openClassDetail', 'openClassModal', 'saveStudentToClass'],
  'public/v15/modules/attendance-runtime.js': ['saveAttendance', 'setAttendanceStatus'],
  'public/v15/modules/schedule-actions.js': ['openScheduleMakeup', 'openTutoringClassModal'],
  'public/v15/modules/makeup.js': ['makeupPage', 'setMakeupMonth'],
};
const lazyStyles = ['dashboard','classes','schedule','staff','library','evaluation','tuition','settings','transfer','report'];

expect(index.includes(`<meta name="msgiang-build" content="${build}"`), 'Build marker đúng');
expect(deployment.build === build, 'deployment-version đồng bộ');
expect(deployment.phase === '8d4-startup-css-network-cleanup', 'deployment phase đúng');
expect(loader.includes(build) && network.includes(build), 'Runtime dùng đúng build');
expect(pkg.scripts.audit.includes('audit-phase8d4'), 'Package chạy audit Phase 8D.4');
expect(pkg.scripts.verify.includes('smoke-module-loader-phase8d4'), 'Package chạy smoke Phase 8D.4');

const networkPos = index.indexOf('/v15/network-runtime.js');
const appPos = index.indexOf('/v15/app.js');
expect(networkPos > 0 && networkPos < appPos, 'Network runtime tải trước app core');
expect(app.includes('window.MsNetworkRuntime.request(path,options)'), 'officialFetch dùng network runtime chung');
expect(!app.includes('const v18gInflightGet=new Map()'), 'Network cache không còn nằm trong app core');

expect(/const SEED\s*=\s*\{[\s\S]{0,500}classes:\s*\[\]/.test(app), 'Production seed đã rút gọn');
expect(!app.includes('"Bình An"') && !app.includes('"s01_01"'), 'Dữ liệu demo lớn không còn trong runtime');
expect(!app.includes('moved to lazy module.'), 'Đã xóa placeholder module cũ');
expect(size('public/v15/app.js') < 260000, `app.js core giảm còn ${Math.round(size('public/v15/app.js') / 1024)} KB`);
expect(size('public/v15/app.css') < 70000, `CSS core giảm còn ${Math.round(size('public/v15/app.css') / 1024)} KB`);

let lazyCssTotal = 0;
for (const name of lazyStyles) {
  const file = `public/v15/styles/${name}.css`;
  expect(exists(file), `Có lazy style ${name}.css`);
  if (exists(file)) lazyCssTotal += size(file);
}
expect(lazyCssTotal > 40000, `Đã tách ${Math.round(lazyCssTotal / 1024)} KB CSS theo module`);
expect(loader.includes('function loadStyle(') && loader.includes('data-msgiang-route-style'), 'Module loader hỗ trợ lazy CSS');
expect(loader.includes("styles: ['schedule.css']"), 'Lịch/điểm danh/học bù tải style riêng');
expect(loader.includes("styles: ['tuition.css']") && loader.includes("styles: ['evaluation.css']"), 'Học phí và Đánh giá tải style riêng');

for (const [file, names] of Object.entries(requiredModules)) {
  expect(exists(file), `Có module ${path.basename(file)}`);
  const body = read(file);
  for (const name of names) {
    expect(body.includes(`function ${name}(`) || body.includes(`async function ${name}(`), `${path.basename(file)} có ${name}`);
  }
}

expect(!app.includes("['attendance','✅','Điểm danh']"), 'Sidebar vẫn không có tab Điểm danh');
expect(coreCss.includes('.staffStatusDot{'), 'CSS trạng thái nhân sự vẫn tách riêng');
expect(/\.statusDot\{[^}]*white-space:nowrap/.test(scheduleCss), 'Badge Lịch dạy vẫn một hàng');
expect(app.includes("const isReceptionist = () => hasRole('receptionist')"), 'Role Lễ tân vẫn tồn tại');
expect(app.includes("const canViewTuition = () => isAdmin() || isManager()"), 'Lễ tân vẫn không có Học phí');
expect(auth.includes('"receptionist"'), 'Backend vẫn nhận role Lễ tân');
expect(read('public/v15/modules/student-transfer.js').includes('confirmStudentTransfer'), 'Chuyển lớp vẫn tồn tại');

const jsFiles = [
  'public/v15/app.js', 'public/v15/module-loader.js', 'public/v15/network-runtime.js',
  'public/v15/realtime-bootstrap.js', 'public/v15/smart-warmup.js',
  ...Object.keys(requiredModules),
  'public/v15/modules/classes.js', 'public/v15/modules/schedule.js',
  'public/v15/modules/attendance-modal.js', 'public/v15/modules/student-transfer.js',
  'public/v15/modules/staff.js', 'public/v15/modules/settings.js', 'public/v15/modules/library.js',
];
for (const file of [...new Set(jsFiles)]) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  expect(result.status === 0, `Cú pháp ${file} hợp lệ`);
  if (result.status !== 0 && result.stderr) console.error(result.stderr.trim());
}

if (process.exitCode) {
  console.error('\nPhase 8D.4 audit thất bại. Không nên deploy.');
  process.exit(process.exitCode);
}
console.log('\nPhase 8D.4 audit đạt.');
