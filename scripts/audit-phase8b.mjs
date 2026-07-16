import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`✓ ${message}`);
const expect = (condition, message) => condition ? pass(message) : fail(message);

const build = '20phase8b-interaction-ui-response';
const index = read('public/index-v15.html');
const app = read('public/v15/app.js');
const css = read('public/v15/app.css');
const schedule = read('public/v15/modules/schedule.js');
const attendance = read('public/v15/modules/attendance-modal.js');
const runtime = read('public/v15/modules/ui-runtime.js');
const auth = read('lib/auth.ts');
const deployment = JSON.parse(read('public/deployment-version.json'));
const pkg = JSON.parse(read('package.json'));

expect(index.includes(`<meta name="msgiang-build" content="${build}"`), 'Build marker đúng');
expect(deployment.build === build, 'deployment-version đồng bộ');
expect(!app.includes("['attendance','✅','Điểm danh']"), 'Sidebar vẫn không có tab Điểm danh');
expect(exists('public/v15/modules/attendance-modal.js'), 'Popup điểm danh vẫn tồn tại');
expect(schedule.includes('data-schedule-session'), 'Thẻ Lịch desktop có khóa patch cục bộ');
expect(schedule.includes('data-mobile-schedule-session'), 'Thẻ Lịch mobile có khóa patch cục bộ');
expect(schedule.includes('data-schedule-count'), 'Thống kê Lịch hỗ trợ cập nhật cục bộ');
expect(app.includes('function v8bPatchScheduleSessions'), 'Có patch đúng buổi học');
expect(app.includes("lessonCard(session,0,true)"), 'Patch thẻ Lịch không chạy animation vào lại');
expect(css.includes('.lessonCard.noEntryAnimation'), 'CSS chống nháy thẻ Lịch đã có');
expect(app.includes('v8bScheduleAttendanceDraftPersist'), 'Điểm danh lưu nháp bằng debounce');
expect(attendance.includes('modalOptions={}'), 'Popup điểm danh hỗ trợ giữ scroll');
expect(attendance.includes('data-attendance-modal'), 'Popup điểm danh có marker ổn định');
expect(app.includes("beginLockedAction(`makeup-batch:${targetSessionKey}`"), 'Xác nhận học bù chống bấm hai lần');
expect(app.includes("measureAsync('Lưu điểm danh'"), 'Có đo thao tác lưu điểm danh chậm');
expect(runtime.includes('runWhenIdle'), 'Có utility trì hoãn ghi local state');
expect(runtime.includes('measureAsync'), 'Có utility timing dùng chung');
expect(app.includes('const wasOpen=modalBackdrop.classList.contains'), 'Popup thay nội dung trên modal shell hiện tại');
expect(app.includes('v8bLastToast'), 'Toast chống hiển thị trùng');
expect(!/function v20l4InvalidateScheduleAfterAttendanceSave[\s\S]{0,900}renderApp\(\)/.test(app), 'Lưu điểm danh không renderApp toàn trang');
expect(!/function v22RefreshScheduleBehindMakeupModal[\s\S]{0,700}renderApp\(\)/.test(app), 'Xếp học bù không renderApp toàn trang');
expect(css.includes('.staffStatusDot{'), 'CSS trạng thái nhân sự vẫn tách riêng');
expect(/\.statusDot\{[^}]*white-space:nowrap/.test(css), 'Badge Lịch dạy vẫn một hàng');
expect(app.includes("const isReceptionist = () => hasRole('receptionist')"), 'Role Lễ tân vẫn tồn tại');
expect(app.includes("const canViewTuition = () => isAdmin() || isManager()"), 'Lễ tân vẫn không có Học phí');
expect(auth.includes('"receptionist"'), 'Backend vẫn nhận role Lễ tân');
expect(app.includes('openStudentTransferModal'), 'Chuyển lớp học sinh vẫn tồn tại');
expect(pkg.scripts.audit.includes('audit-phase8b'), 'Package chạy đúng audit Phase 8B');

if (process.exitCode) {
  console.error('\nPhase 8B audit thất bại. Không nên deploy.');
  process.exit(process.exitCode);
}
console.log('\nPhase 8B audit đạt.');
