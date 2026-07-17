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

const build = '20phase8d2-linked-runtime-module-split';
const index = read('public/index-v15.html');
const app = read('public/v15/app.js');
const loader = read('public/v15/module-loader.js');
const warmup = read('public/v15/smart-warmup.js');
const css = read('public/v15/app.css');
const auth = read('lib/auth.ts');
const deployment = JSON.parse(read('public/deployment-version.json'));
const pkg = JSON.parse(read('package.json'));

const requiredModules = {
  'public/v15/modules/classes-runtime.js': ['openClassDetail', 'openClassModal', 'saveStudentToClass'],
  'public/v15/modules/attendance-runtime.js': ['saveAttendance', 'setAttendanceStatus', 'addManualMakeupToAttendance'],
  'public/v15/modules/schedule-actions.js': ['openScheduleMakeup', 'openTutoringClassModal', 'confirmScheduleMakeupBatch'],
  'public/v15/modules/makeup.js': ['makeupPage', 'setMakeupMonth', 'openDeleteMakeupMonthModal'],
};

expect(index.includes(`<meta name="msgiang-build" content="${build}"`), 'Build marker đúng');
expect(deployment.build === build, 'deployment-version đồng bộ');
expect(deployment.phase === '8d2-linked-runtime-module-split', 'deployment phase đúng');
expect(loader.includes(build), 'Module loader dùng đúng build');
expect(warmup.includes(build), 'Smart warm-up dùng đúng build');
expect(pkg.scripts.audit.includes('audit-phase8d2'), 'Package chạy audit Phase 8D.2');
expect(pkg.scripts.verify.includes('smoke-module-loader-phase8d2'), 'Package chạy smoke Phase 8D.2');

for (const [file, names] of Object.entries(requiredModules)) {
  expect(exists(file), `Có module ${path.basename(file)}`);
  const body = read(file);
  for (const name of names) expect(body.includes(`function ${name}(`) || body.includes(`async function ${name}(`), `${path.basename(file)} có ${name}`);
}

expect(loader.includes("classesRuntime: { file: 'classes-runtime.js'"), 'Runtime Lớp học được lazy-load');
expect(loader.includes("classes: { file: 'classes.js', ready: 'classesPage', dependencies: ['classesRuntime'] }"), 'Trang Lớp học tải runtime đúng thứ tự');
expect(loader.includes("attendanceRuntime: { file: 'attendance-runtime.js'"), 'Runtime Điểm danh được lazy-load');
expect(loader.includes("attendancePopup: { file: 'attendance-modal.js', ready: 'openAttendance', dependencies: ['attendanceRuntime', 'makeup'] }"), 'Popup Điểm danh tải runtime và dữ liệu Học bù trước');
expect(loader.includes("makeup: { file: 'makeup.js', ready: 'makeupPage' }"), 'Trang Học bù được lazy-load');
expect(loader.includes("scheduleActions: { file: 'schedule-actions.js'"), 'Thao tác Lịch/Học bù được lazy-load');
expect(loader.includes("schedule: { file: 'schedule.js', ready: 'schedulePage', dependencies: ['attendancePopup', 'classesRuntime', 'scheduleActions'] }"), 'Lịch dạy tải đủ dependency liên kết');

expect(app.includes("makeup:'makeupPage'"), 'Router dùng renderer Học bù lazy');
expect(!app.includes('function openClassDetail('), 'openClassDetail đã rời app core');
expect(!app.includes('function openClassModal('), 'openClassModal đã rời app core');
expect(!app.includes('function saveAttendance('), 'saveAttendance đã rời app core');
expect(!app.includes('function openScheduleMakeup('), 'openScheduleMakeup đã rời app core');
expect(!app.includes('function makeupPage('), 'makeupPage đã rời app core');
expect(app.includes("typeof window.v22RefreshScheduleBehindMakeupModal==='function'"), 'Core guard helper Lịch/Học bù chưa tải');
expect(app.includes("typeof window.refreshScheduleMakeupDraftDom==='function'"), 'Core guard patch popup Học bù chưa tải');

expect(size('public/v15/app.js') < 600000, `app.js core giảm còn ${Math.round(size('public/v15/app.js') / 1024)} KB`);
expect(size('public/v15/modules/classes-runtime.js') > 45000, 'Khối runtime Lớp học đã thực sự được tách');
expect(size('public/v15/modules/schedule-actions.js') > 30000, 'Khối thao tác Lịch/Học bù đã thực sự được tách');
expect(size('public/v15/modules/attendance-runtime.js') > 9000, 'Khối thao tác Điểm danh đã thực sự được tách');
expect(size('public/v15/modules/makeup.js') > 10000, 'Trang Học bù đã thực sự được tách');

expect(!app.includes("['attendance','✅','Điểm danh']"), 'Sidebar vẫn không có tab Điểm danh');
expect(css.includes('.staffStatusDot{'), 'CSS trạng thái nhân sự vẫn tách riêng');
expect(/\.statusDot\{[^}]*white-space:nowrap/.test(css), 'Badge Lịch dạy vẫn một hàng');
expect(app.includes("const isReceptionist = () => hasRole('receptionist')"), 'Role Lễ tân vẫn tồn tại');
expect(app.includes("const canViewTuition = () => isAdmin() || isManager()"), 'Lễ tân vẫn không có Học phí');
expect(auth.includes('"receptionist"'), 'Backend vẫn nhận role Lễ tân');
expect(read('public/v15/modules/student-transfer.js').includes('confirmStudentTransfer'), 'Chuyển lớp vẫn tồn tại');

const jsFiles = [
  'public/v15/app.js',
  'public/v15/module-loader.js',
  'public/v15/smart-warmup.js',
  ...Object.keys(requiredModules),
  'public/v15/modules/classes.js',
  'public/v15/modules/schedule.js',
  'public/v15/modules/attendance-modal.js',
  'public/v15/modules/student-transfer.js',
  'public/v15/modules/staff.js',
  'public/v15/modules/settings.js',
  'public/v15/modules/library.js',
  'public/v15/modules/evaluation.js',
  'public/v15/modules/tuition.js',
];
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  expect(result.status === 0, `Cú pháp ${file} hợp lệ`);
  if (result.status !== 0 && result.stderr) console.error(result.stderr.trim());
}

if (process.exitCode) {
  console.error('\nPhase 8D.2 audit thất bại. Không nên deploy.');
  process.exit(process.exitCode);
}
console.log('\nPhase 8D.2 audit đạt.');
