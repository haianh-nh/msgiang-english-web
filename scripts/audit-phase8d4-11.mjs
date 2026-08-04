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

const build = '20phase8d4-11-library-pdf-tab-fix';
const phase = '8d4-11-library-pdf-tab-fix';
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
const staffModule = read('public/v15/modules/staff.js');

const attendanceSaveRoute = read('app/api/attendance/save/route.ts');
const classesLib = read('lib/classes.ts');
const scheduleStateRoute = read('app/api/schedule/state/route.ts');
const makeupStateRoute = read('app/api/makeup/state/route.ts');
const makeupModule = read('public/v15/modules/makeup.js');
const scheduleActionsModule = read('public/v15/modules/schedule-actions.js');
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
expect(pkg.scripts.audit.includes('audit-phase8d4-11'), 'Package chạy audit 8D.4.11');
expect(pkg.scripts.verify.includes('smoke-module-loader-phase8d4-9'), 'Package chạy smoke 8D.4.9');
expect(pkg.scripts.verify.includes('smoke-makeup-backlog-phase8d4-8'), 'Package chạy smoke backlog Học bù 8D.4.8');

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
expect(staffModule.includes('function v7hIsTutoringClass(c)') && staffModule.includes('function mainClassesOfTeacher(t)'), 'Có bộ lọc lớp Học kèm riêng cho thẻ nhân sự');
expect(/function teacherCard\(t,i\)\{\s*const cls=mainClassesOfTeacher\(t\);/.test(staffModule), 'Thẻ giáo viên chỉ dùng danh sách lớp chính');
expect(staffModule.includes("note.startsWith('__tutoring_session__')") && staffModule.includes("sourceKey.startsWith('tutoring:')") && staffModule.includes("/^hoc kem(?:\\s|$)/.test(name)"), 'Bộ lọc nhận diện đầy đủ lớp Học kèm');
expect(/function v7hTeacherClassPanelMarkup\(t\)\{\s*const cls=mainClassesOfTeacher\(t\);/.test(staffModule), 'Popup giáo viên chỉ hiển thị lớp chính');
expect(staffModule.includes('.filter(c=>!v7hIsTutoringClass(c))') && staffModule.includes('Lớp học kèm không được quản lý trong popup nhân sự.'), 'Dropdown và thao tác gán lớp trong popup loại hoàn toàn lớp Học kèm');
expect(/\.statusDot\{[^}]*white-space:nowrap/.test(scheduleCss), 'Badge Lịch dạy vẫn một hàng');
expect(app.includes("const isReceptionist = () => hasRole('receptionist')"), 'Role Lễ tân vẫn tồn tại');
expect(app.includes("const canViewTuition = () => isAdmin() || isManager()"), 'Lễ tân vẫn không có Học phí');
expect(auth.includes('"receptionist"'), 'Backend vẫn nhận role Lễ tân');
expect(read('public/v15/modules/student-transfer.js').includes('confirmStudentTransfer'), 'Chuyển lớp vẫn tồn tại');

expect(classesLib.includes('export async function teacherIdentitiesForUser') && !/teacherForUser[\s\S]{0,700}maybeSingle\(\)/.test(classesLib), 'Liên kết tài khoản giáo viên không còn phụ thuộc maybeSingle');
expect(classesLib.includes('assignmentFilter') && classesLib.includes('.in("teacher_id", teacherIds)'), 'API lớp hỗ trợ nhiều hồ sơ giáo viên cùng tài khoản');
expect(attendanceSaveRoute.includes('attendancePermissionForUser') && attendanceSaveRoute.includes('teacher_profile_not_linked') && attendanceSaveRoute.includes('teacher_not_assigned'), 'API điểm danh trả lỗi quyền rõ ràng');
expect(attendanceSaveRoute.includes('.in("teacher_id", teacherIds)'), 'Điểm danh buổi dạy bù chấp nhận mọi teacher identity hợp lệ');
expect(app.includes("timeZone:'Asia/Ho_Chi_Minh'") && app.includes("T${timeKey}:00+07:00"), 'Cửa sổ điểm danh dùng giờ Việt Nam cố định');
expect(app.includes('if(isTeachingUser()) return operationalClasses();') && app.includes('else if(isTeachingUser()) rows=operationalClasses();'), 'Frontend không lọc lại lớp giáo viên bằng tên/SĐT');
expect(app.includes("type:makeup?'class_makeup':'regular'"), 'Buổi dạy bù giữ đúng loại khi lưu điểm danh');
expect(scheduleStateRoute.includes('legacy-teacher-aliases') && scheduleStateRoute.includes('teacherIdentitiesForUser(user)'), 'Lịch tuần có fallback cho hồ sơ giáo viên trùng');


expect(makeupStateRoute.includes('.eq("status", "pending")') && makeupStateRoute.includes('pendingScope: "all-open-months"'), 'API Học bù trả toàn bộ lượt pending chưa xóa theo tháng');
expect(makeupStateRoute.includes('blockedAbsenceIds') && makeupStateRoute.includes('["scheduled", "completed"]'), 'API chống hiện trùng lượt đã có lịch/đã hoàn tất');
expect(app.includes('return pendingMakeupRows(null)') && !app.includes('return pendingMakeupRows(targetMonth)'), 'Popup xếp học bù lấy backlog mọi tháng');
expect(app.includes("makeupModuleCacheKey(month=makeupSelectedMonthKey()){return `makeup-all-open-v1:${month}`}"), 'Cache Học bù đổi schema để loại dữ liệu tháng cũ');
expect(app.includes("db.makeupTabState.pendingScope==='all-open-months'"), 'Cache cũ thiếu pendingScope bị buộc tải lại');
expect(makeupModule.includes('const pendingRows=makeupTabPendingRows(tabState,null);'), 'Tab Học bù hiển thị Chờ xếp toàn bộ tháng');
expect(makeupModule.includes('tồn đọng mọi tháng') && makeupModule.includes('Tất cả lượt vắng chưa học bù'), 'UI giải thích rõ danh sách tồn đọng');
expect((scheduleActionsModule.match(/pendingMakeupRows\(null\)/g)||[]).length >= 2, 'Popup Lịch dạy dùng backlog mọi tháng khi mở và làm mới');
expect(scheduleActionsModule.includes('return makeupTabPendingRows(st,null);') && scheduleActionsModule.includes('Tất cả tháng'), 'Popup tạo lớp Học kèm cũng hiển thị backlog mọi tháng');
expect(scheduleActionsModule.includes('Phát sinh ${h(formatMonthKeyVN(sourceMonth))}') && makeupModule.includes('Phát sinh ${h(formatMonthKeyVN(sourceMonth))}'), 'Danh sách ghi rõ tháng phát sinh lượt nghỉ');


const libraryModule = read('public/v15/modules/library.js');
const libraryRuntime = read('public/v15/modules/homework-library-runtime.js');
const libraryCss = read('public/v15/styles/library.css');
const libraryRoute = read('app/api/library/route.ts');
const libraryPreviewRoute = read('app/api/library/[id]/preview/route.ts');
const libraryFileRoute = read('app/api/library/[id]/file/route.ts');
expect(exists('app/api/library/[id]/file/route.ts'), 'Có API file dùng chung cho xem trước/tải xuống');
expect(libraryRoute.includes('function clientType') && libraryRoute.includes('type: clientType(row)'), 'API thư viện nhận diện loại file theo phần mở rộng/MIME thật');
expect(libraryRuntime.includes('function libraryFileKind') && libraryRuntime.includes('v8d49LibraryPreviewCache'), 'Frontend nhận diện đúng file và cache DOCX trong phiên');
expect(libraryRuntime.includes('mở tab mới') || libraryRuntime.includes('Mở tab mới'), 'Popup PDF có phương án mở tab mới');
expect(libraryRuntime.includes('libraryInlineFileUrl') && libraryRuntime.includes('libraryDownloadUrl'), 'Preview và download dùng URL chuẩn hóa');
expect(libraryModule.includes('Xem trước') && libraryModule.includes('Tải xuống') && !libraryModule.includes('Mở / tải Word'), 'Thẻ tài liệu chuẩn hóa nút Xem trước/Tải xuống');
expect(libraryPreviewRoute.includes('mammoth.convertToHtml') && !libraryPreviewRoute.includes('extractRawText'), 'DOCX được chuyển thành HTML thay vì text thô');
expect(libraryPreviewRoute.includes('sanitizeMammothHtml') && libraryPreviewRoute.includes('MAX_DOCX_PREVIEW_BYTES'), 'DOCX preview có lọc HTML và giới hạn dung lượng');
expect(libraryFileRoute.includes('Content-Disposition') && libraryFileRoute.includes('filename*=UTF-8'), 'Download giữ đúng tên file và ép tải ổn định');
expect(libraryCss.includes('.libraryPreviewModal') && libraryCss.includes('.docxPreviewDocument') && libraryCss.includes('.simpleLibraryActions.noDelete'), 'CSS preview và ba nút tài liệu đầy đủ');
expect(pkg.scripts.verify.includes('smoke-library-preview-phase8d4-9'), 'Package chạy smoke preview PDF/DOCX');
expect(pkg.scripts.verify.includes('smoke-library-tabs-phase8d4-11'), 'Package chạy smoke tab Word/PDF/Audio 8D.4.11');
expect(!libraryRuntime.includes("x?.type==='pdf'?{...x,type:'word'}"), 'Không còn đổi dữ liệu PDF thành Word ở runtime');
expect(!libraryRuntime.includes("db.libraryTab=(tab==='pdf'?'word':tab)"), 'Nút PDF không còn bị ép quay về Word');
expect(!app.includes("if(db.libraryTab==='pdf') db.libraryTab='word'"), 'Normalize dữ liệu không còn đổi tab PDF về Word');
expect(!app.includes("if(x.type==='pdf')x.type='word'"), 'Normalize dữ liệu không còn đổi type PDF về Word');
expect(libraryRuntime.includes("db.libraryTab=['word','pdf','audio'].includes(tab)?tab:'word'"), 'Tab thư viện chấp nhận riêng Word/PDF/Audio');

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
  console.error('\nPhase 8D.4.11 audit thất bại. Không nên deploy.');
  process.exit(process.exitCode);
}
const tutoringRoute = read('app/api/schedule/tutoring/route.ts');
expect(scheduleActionsModule.includes('function tutoringTodayVNISO()') && scheduleActionsModule.includes('const today=tutoringTodayVNISO();'), 'Ngày mặc định lớp Học kèm dùng lịch Việt Nam');
expect(!tutoringRoute.includes('months.length !== 1') && tutoringRoute.includes('for (const monthKey of months)'), 'API cho phép gom lượt vắng từ nhiều tháng và kiểm tra từng tháng');
expect(tutoringRoute.includes('Giáo viên dạy không còn hoạt động hoặc chưa được liên kết'), 'API kiểm tra giáo viên được chọn rõ ràng');

console.log('\nPhase 8D.4.11 audit đạt.');
