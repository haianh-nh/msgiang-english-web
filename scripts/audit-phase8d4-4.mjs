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

const build = '20phase8d4-4-tuition-search-reset';
const phase = '8d4-4-tuition-search-reset';
const index = read('public/index-v15.html');
const app = read('public/v15/app.js');
const loader = read('public/v15/module-loader.js');
const network = read('public/v15/network-runtime.js');
const realtime = read('public/v15/realtime-bootstrap.js');
const warmup = read('public/v15/smart-warmup.js');
const coreCss = read('public/v15/app.css');
const dashboardCss = read('public/v15/styles/dashboard.css');
const tuitionCss = read('public/v15/styles/tuition.css');
const scheduleCss = read('public/v15/styles/schedule.css');
const auth = read('lib/auth.ts');
const versionRoute = read('app/api/version/route.ts');
const nextConfig = read('next.config.mjs');
const deployment = JSON.parse(read('public/deployment-version.json'));
const pkg = JSON.parse(read('package.json'));

const requiredModules = {
  'public/v15/modules/dashboard.js': ['overview', 'quickTodos', 'notifications'],
  'public/v15/modules/report-images.js': ['openGeneratedImageModal', 'drawCanvasText'],
  'public/v15/modules/tuition.js': ['tuitionPage', 'markPaid', 'v7fPatchTuitionVisibleDom'],
  'public/v15/modules/evaluation.js': ['evaluationPage', 'saveEvaluation', 'openEvaluationImage', 'v7fIsEvaluationDirty'],
  'public/v15/modules/classes-runtime.js': ['openClassDetail', 'openClassModal', 'saveStudentToClass'],
  'public/v15/modules/attendance-runtime.js': ['saveAttendance', 'setAttendanceStatus'],
  'public/v15/modules/schedule-actions.js': ['openScheduleMakeup', 'openTutoringClassModal'],
  'public/v15/modules/makeup.js': ['makeupPage', 'setMakeupMonth'],
};
const lazyStyles = ['dashboard','classes','schedule','staff','library','evaluation','tuition','settings','transfer','report'];

expect(index.includes(`<meta name="msgiang-build" content="${build}"`), 'Build marker HTML đúng');
expect(deployment.build === build && deployment.phase === phase, 'deployment-version đồng bộ');
expect([app, loader, network, realtime, warmup].every((body) => body.includes(build)), 'Toàn bộ frontend runtime dùng đúng build');
expect(versionRoute.includes(`build: "${build}"`) && versionRoute.includes(`phase: "${phase}"`), 'API version dùng đúng build/phase');
expect(nextConfig.match(new RegExp(build, 'g'))?.length === 2, 'Response headers dùng đúng build');
expect(pkg.scripts.audit.includes('audit-phase8d4-4'), 'Package chạy audit 8D.4.4');
expect(pkg.scripts.verify.includes('smoke-module-loader-phase8d4-4'), 'Package chạy smoke 8D.4.4');

const networkPos = index.indexOf('/v15/network-runtime.js');
const appPos = index.indexOf('/v15/app.js');
expect(networkPos > 0 && networkPos < appPos, 'Network runtime tải trước app core');
expect(app.includes('window.MsNetworkRuntime.request(path,options)'), 'officialFetch vẫn dùng network runtime chung');
expect(!app.includes('const v18gInflightGet=new Map()'), 'Network cache không quay lại app core');

expect(/\.statGrid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\);gap:16px\}/.test(coreCss), 'CSS grid thẻ thống kê nằm trong CSS lõi');
expect(coreCss.includes('.statIcon{width:62px;height:62px'), 'CSS icon thẻ thống kê nằm trong CSS lõi');
expect(!dashboardCss.includes('.statGrid{') && !dashboardCss.includes('.statIcon{'), 'dashboard.css không còn giữ CSS dùng chung của Học phí');
expect(tuitionCss.includes('.tuitionFilters{') && tuitionCss.includes('.tuitionTableWrap{'), 'CSS riêng Học phí vẫn đầy đủ');
expect(app.includes('window.MsRouteModules?.isReady(route)'), 'Route kiểm tra cả module và CSS trước khi render');
expect(!loader.includes('existing.sheet'), 'Lazy CSS không còn đánh dấu ready bằng link.sheet');
expect(loader.includes("link.dataset.msgiangLoaded = 'true'") && loader.includes('link.onload = finish'), 'Lazy CSS chỉ ready sau onload');
expect(loader.includes('removeStyleLink(link)') && loader.includes('STYLE_TIMEOUT_MS'), 'Lazy CSS lỗi/stale được xóa và có timeout');
expect(loader.includes("link.dataset.msgiangBuild = BUILD_VERSION"), 'Lazy CSS gắn build marker riêng');

expect(/const SEED\s*=\s*\{[\s\S]{0,500}classes:\s*\[\]/.test(app), 'Production seed vẫn rút gọn');
expect(!app.includes('"Bình An"') && !app.includes('"s01_01"'), 'Dữ liệu demo lớn không quay lại runtime');
expect(size('public/v15/app.js') < 260000, `app.js core còn ${Math.round(size('public/v15/app.js') / 1024)} KB`);
expect(size('public/v15/app.css') < 70000, `CSS core còn ${Math.round(size('public/v15/app.css') / 1024)} KB`);

let lazyCssTotal = 0;
for (const name of lazyStyles) {
  const file = `public/v15/styles/${name}.css`;
  expect(exists(file), `Có lazy style ${name}.css`);
  if (exists(file)) lazyCssTotal += size(file);
}
expect(lazyCssTotal > 35000, `Vẫn tách ${Math.round(lazyCssTotal / 1024)} KB CSS theo module`);
expect(loader.includes("tuition: { file: 'tuition.js', ready: 'tuitionPage', styles: ['tuition.css'] }") && loader.includes("styles: ['evaluation.css']"), 'Học phí tải style riêng và không còn phụ thuộc tạo ảnh');
expect(!read('public/v15/modules/tuition.js').includes('openTuitionImage') && !read('public/v15/modules/tuition.js').includes('tuitionImageData'), 'Đã loại bỏ tính năng tạo ảnh Học phí');
expect(read('public/v15/modules/tuition.js').includes('Đã đóng ${g.paid}/${g.items.length}'), 'Tóm tắt lớp dùng trạng thái Đã đóng');
expect(!app.includes('rows=rows.filter(r=>r.billingEligible!==false'), 'Danh sách Học phí giữ cả học sinh chưa tới tháng tính phí');
expect(tuitionCss.includes('max-height:none') && tuitionCss.includes('overflow:visible'), 'Bảng lớp hiển thị toàn bộ học sinh, không cuộn dọc riêng');
expect(tuitionCss.includes('table-layout:fixed') && tuitionCss.includes('min-width:0!important'), 'Bảng Học phí desktop được thu gọn vừa chiều ngang');
const tuitionModule = read('public/v15/modules/tuition.js');
expect(!/Đơn giá\/buổi:/.test(tuitionModule.slice(tuitionModule.indexOf('function tuitionMessageText'), tuitionModule.indexOf('async function copyTuitionMessage'))), 'Text học phí đã bỏ đơn giá');
expect(!/Trạng thái:/.test(tuitionModule.slice(tuitionModule.indexOf('function tuitionMessageText'), tuitionModule.indexOf('async function copyTuitionMessage'))), 'Text học phí đã bỏ trạng thái');
expect(tuitionModule.includes('if(materialFee>0)') && tuitionModule.includes('if(previousDebt>0)') && tuitionModule.includes('if(creditAmount>0)'), 'Text học phí ẩn các khoản bằng 0');
expect(tuitionModule.includes('𝗧𝗢̂̉𝗡𝗚 𝗖𝗔̂̀𝗡 Đ𝗢́𝗡𝗚') && tuitionModule.includes('tuitionMessageHtml'), 'Tổng cần đóng được nhấn mạnh');

expect(app.includes("compactSettings.tuitionFilter={") && app.includes("q:'',"), 'Local snapshot không lưu lại từ khóa tìm kiếm Học phí');
expect(app.includes('function v18hResetPersistedTuitionSearch(settings)') && app.includes("if(db.settings?.tuitionFilter) db.settings.tuitionFilter.q='';"), 'Bootstrap xóa từ khóa Học phí cũ');
expect(app.includes("payload.settings.tuitionFilter={...payload.settings.tuitionFilter,q:''}"), 'Official snapshot không lưu từ khóa tìm kiếm Học phí');
expect(app.includes("if(field==='q') v18bRenderDebounced('tuitionFilter',220)"), 'Tìm kiếm Học phí vẫn hoạt động trong phiên hiện tại');


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
  console.error('\nPhase 8D.4.4 audit thất bại. Không nên deploy.');
  process.exit(process.exitCode);
}
console.log('\nPhase 8D.4.4 audit đạt.');
