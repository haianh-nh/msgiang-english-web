import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error(`✗ ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`✓ ${message}`);
const expect = (condition, message) => condition ? pass(message) : fail(message);

const build = '20phase8-student-transfer-schedule-attendance';
const index = read('public/index-v15.html');
const app = read('public/v15/app.js');
const css = read('public/v15/app.css');
const loader = read('public/v15/module-loader.js');
const transferApi = read('app/api/students/[id]/transfer/route.ts');
const migration = read('supabase/migrations/20260716_phase8_student_transfer_enrollments.sql');
const auth = read('lib/auth.ts');
const deployment = JSON.parse(read('public/deployment-version.json'));
const pkg = JSON.parse(read('package.json'));

expect(index.includes(`<meta name="msgiang-build" content="${build}"`), 'Build marker đúng');
expect(deployment.build === build, 'deployment-version đồng bộ');
expect(!app.includes("['attendance','✅','Điểm danh']"), 'Sidebar không còn tab Điểm danh');
expect(!app.includes("attendance:'attendancePage'"), 'Không còn renderer trang Điểm danh');
expect(!exists('public/v15/modules/attendance.js'), 'Đã xóa module trang Điểm danh cũ');
expect(exists('public/v15/modules/attendance-modal.js'), 'Popup điểm danh vẫn được giữ');
expect(loader.includes("attendancePopup: { file: 'attendance-modal.js', ready: 'openAttendance' }"), 'Lịch dạy tải popup điểm danh theo dependency');
expect(loader.includes("dependencies: ['attendancePopup']"), 'Module Lịch dạy phụ thuộc popup điểm danh');
expect(app.includes("if(r==='attendance') r='schedule'"), 'Route Điểm danh cũ chuyển sang Lịch dạy');
expect(app.includes('openStudentTransferModal'), 'Có popup chuyển lớp học sinh');
expect(app.includes('confirmStudentTransfer'), 'Có luồng xác nhận chuyển lớp');
expect(app.includes('v30PatchTransferredStudentUi'), 'Chuyển lớp cập nhật UI cục bộ');
expect(app.includes('v28BeginModalAction(button'), 'Chuyển lớp có khóa nút chống bấm lặp');
expect(transferApi.includes('official_transfer_student'), 'API gọi RPC chuyển lớp nguyên tử');
expect(transferApi.includes('requestId'), 'API hỗ trợ idempotency');
expect(migration.includes('official_student_enrollments'), 'Có bảng lịch sử lớp');
expect(migration.includes('official_transfer_student'), 'Có RPC chuyển lớp');
expect(migration.includes('official_students_initial_enrollment_trigger'), 'Học sinh mới tự có enrollment');
expect(css.includes('.staffStatusDot{'), 'CSS trạng thái nhân sự vẫn tách riêng');
expect(/\.statusDot\{[^}]*white-space:nowrap/.test(css), 'Badge Lịch dạy vẫn một hàng');
expect(app.includes("const isReceptionist = () => hasRole('receptionist')"), 'Role Lễ tân vẫn tồn tại');
expect(app.includes("const canViewTuition = () => isAdmin() || isManager()"), 'Lễ tân không có quyền Học phí');
expect(auth.includes('"receptionist"'), 'Backend vẫn nhận role Lễ tân');
expect(pkg.scripts.audit.includes('audit-phase8'), 'Package chạy đúng audit Phase 8');

if (process.exitCode) {
  console.error('\nPhase 8.0 audit thất bại. Không nên deploy.');
  process.exit(process.exitCode);
}
console.log('\nPhase 8.0 audit đạt.');
