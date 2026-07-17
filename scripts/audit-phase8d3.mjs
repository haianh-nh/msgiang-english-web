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

const build = '20phase8d3-dashboard-tuition-evaluation-split';
const index = read('public/index-v15.html');
const app = read('public/v15/app.js');
const loader = read('public/v15/module-loader.js');
const css = read('public/v15/app.css');
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

expect(index.includes(`<meta name="msgiang-build" content="${build}"`), 'Build marker đúng');
expect(deployment.build === build, 'deployment-version đồng bộ');
expect(deployment.phase === '8d3-dashboard-tuition-evaluation-split', 'deployment phase đúng');
expect(loader.includes(build), 'Module loader dùng đúng build');
expect(pkg.scripts.audit.includes('audit-phase8d3'), 'Package chạy audit Phase 8D.3');
expect(pkg.scripts.verify.includes('smoke-module-loader-phase8d3'), 'Package chạy smoke Phase 8D.3');

for (const [file, names] of Object.entries(requiredModules)) {
  expect(exists(file), `Có module ${path.basename(file)}`);
  const body = read(file);
  for (const name of names) {
    expect(body.includes(`function ${name}(`) || body.includes(`async function ${name}(`), `${path.basename(file)} có ${name}`);
  }
}

expect(loader.includes("overview: { file: 'dashboard.js', ready: 'overview' }"), 'Dashboard được lazy-load');
expect(loader.includes("reportImages: { file: 'report-images.js', ready: 'openGeneratedImageModal' }"), 'Canvas helper được lazy-load');
expect(loader.includes("tuition: { file: 'tuition.js', ready: 'tuitionPage', dependencies: ['reportImages'] }"), 'Học phí tải helper ảnh đúng thứ tự');
expect(loader.includes("evaluation: { file: 'evaluation.js', ready: 'evaluationPage', dependencies: ['reportImages'] }"), 'Đánh giá tải helper ảnh đúng thứ tự');
expect(app.includes("overview:'overview'"), 'Router dùng Dashboard lazy');
expect(!app.includes('function overview('), 'overview đã rời app core');
expect(!app.includes('function markPaid('), 'runtime Học phí đã rời app core');
expect(!app.includes('function saveEvaluation('), 'runtime Đánh giá đã rời app core');
expect(!app.includes('function openGeneratedImageModal('), 'Canvas/report helper đã rời app core');
expect(app.includes('function normalizeEvaluationMonthValue('), 'Helper tháng đánh giá vẫn ở core để refresh nền an toàn');

expect(size('public/v15/app.js') < 530000, `app.js core giảm còn ${Math.round(size('public/v15/app.js') / 1024)} KB`);
expect(size('public/v15/modules/dashboard.js') > 5000, 'Dashboard đã thực sự được tách');
expect(size('public/v15/modules/tuition.js') > 35000, 'Runtime Học phí đã thực sự được tách');
expect(size('public/v15/modules/evaluation.js') > 25000, 'Runtime Đánh giá đã thực sự được tách');

expect(!app.includes("['attendance','✅','Điểm danh']"), 'Sidebar vẫn không có tab Điểm danh');
expect(css.includes('.staffStatusDot{'), 'CSS trạng thái nhân sự vẫn tách riêng');
expect(/\.statusDot\{[^}]*white-space:nowrap/.test(css), 'Badge Lịch dạy vẫn một hàng');
expect(app.includes("const isReceptionist = () => hasRole('receptionist')"), 'Role Lễ tân vẫn tồn tại');
expect(app.includes("const canViewTuition = () => isAdmin() || isManager()"), 'Lễ tân vẫn không có Học phí');
expect(auth.includes('"receptionist"'), 'Backend vẫn nhận role Lễ tân');
expect(read('public/v15/modules/student-transfer.js').includes('confirmStudentTransfer'), 'Chuyển lớp vẫn tồn tại');

const jsFiles = [
  'public/v15/app.js', 'public/v15/module-loader.js', 'public/v15/smart-warmup.js',
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
  console.error('\nPhase 8D.3 audit thất bại. Không nên deploy.');
  process.exit(process.exitCode);
}
console.log('\nPhase 8D.3 audit đạt.');
