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

const build = '20phase7l-frontend-bundle-assets';
const index = read('public/index-v15.html');
const app = read('public/v15/app.js');
const css = read('public/v15/app.css');
const auth = read('lib/auth.ts');
const login = read('app/api/auth/login/route.ts');
const classesLib = read('lib/classes.ts');
const usersRoute = read('app/api/users/route.ts');
const teachersRoute = read('app/api/teachers/route.ts');
const evaluationsRoute = read('app/api/evaluations/route.ts');
const dbSelects = read('lib/db-selects.ts');
const migration = read('supabase/migrations/20260715_phase7k_database_query_performance.sql');
const nextConfig = read('next.config.mjs');
const deployment = JSON.parse(read('public/deployment-version.json'));
const moduleLoader = read('public/v15/module-loader.js');
const pkg = JSON.parse(read('package.json'));

// Phase/build consistency.
expect(index.includes(`<meta name="msgiang-build" content="${build}"`), 'Build marker đúng trong index-v15.html');
expect(index.includes(`/v15/modules/ui-runtime.js?v=${build}`), 'UI runtime dùng đúng build version');
expect(index.indexOf('modules/ui-runtime.js') < index.indexOf('/v15/app.js'), 'UI runtime được nạp trước app.js');
expect(index.includes(`/v15/module-loader.js?v=${build}`), 'Route module loader dùng đúng build version');
expect(index.indexOf('module-loader.js') < index.indexOf('/v15/app.js'), 'Route module loader được nạp trước app.js');
expect(!index.includes('/v15/modules/classes.js'), 'Module Lớp học không tải ở lần mở đầu');
expect(!index.includes('/v15/modules/schedule.js'), 'Module Lịch dạy không tải ở lần mở đầu');
expect(!index.includes('/v15/modules/attendance.js'), 'Module Điểm danh không tải ở lần mở đầu');
expect(!index.includes('/v15/modules/tuition.js'), 'Module Học phí không tải ở lần mở đầu');
expect(!index.includes('/v15/modules/library.js'), 'Module Thư viện không tải ở lần mở đầu');
expect(!index.includes('/v15/modules/evaluation.js'), 'Module Đánh giá không tải ở lần mở đầu');
expect(nextConfig.includes(build), 'Build marker đúng trong next.config.mjs');
expect(/cpus:\s*2/.test(nextConfig), 'Build giới hạn worker để ổn định trên máy/Vercel');
expect(deployment.build === build && deployment.phase === '7l-frontend-bundle-assets', 'deployment-version.json đồng bộ');

// Keep Phase 7J UI/security regressions blocked.
expect(css.includes('.staffStatusDot{'), 'Trạng thái nhân sự dùng class riêng');
expect(!css.includes('.statusDot{display:inline-block;width:8px;height:8px'), 'Không có CSS nhân sự đè badge Lịch dạy');
expect(/\.statusDot\{[^}]*white-space:nowrap/.test(css), 'Badge trạng thái Lịch dạy luôn nằm ngang');
expect(/\.classMakeupBadge\{[^}]*white-space:nowrap/.test(css), 'Badge Học kèm/Dạy bù luôn nằm ngang');
expect(app.includes("const isReceptionist = () => hasRole('receptionist')"), 'Frontend vẫn nhận role Lễ tân');
expect(app.includes("const canViewTuition = () => isAdmin() || isManager()"), 'Lễ tân vẫn bị tách khỏi quyền Học phí');
expect(app.includes("if(r==='tuition' && !canViewTuition())"), 'Route Học phí vẫn được bảo vệ');
expect(auth.includes('"receptionist"'), 'Backend auth vẫn khai báo role Lễ tân');

// Phase 7K query/payload improvements.
expect(dbSelects.includes('AUTH_LOGIN_USER_SELECT'), 'Có selector đăng nhập tối giản dùng chung');
expect(dbSelects.includes('CLASS_WITH_RELATIONS_SELECT'), 'Có selector lớp/roster rõ cột');
expect(login.includes('.in("phone", candidates)'), 'Đăng nhập truy vấn trực tiếp theo tài khoản/SĐT');
expect(!login.includes('.select("*").eq("status", "active")'), 'Đăng nhập không tải toàn bộ tài khoản active');
expect(!auth.includes('official_users(*)'), 'Session auth không tải toàn bộ cột user');
expect(auth.includes('.gt("expires_at"'), 'Session hết hạn được lọc ngay trong truy vấn');
expect(!classesLib.includes('official_students(*)'), 'Danh sách lớp không dùng official_students(*)');
expect(classesLib.includes('CLASS_WITH_RELATIONS_SELECT'), 'Danh sách lớp dùng selector tập trung');
expect(!usersRoute.includes('.select("*")'), 'API tài khoản không trả toàn bộ cột/password hash');
expect(!teachersRoute.includes('.select("*")'), 'API giáo viên không trả toàn bộ cột');
expect(!evaluationsRoute.includes('.select("*")'), 'API đánh giá không trả toàn bộ cột');
expect(migration.includes('idx_official_users_status_created_at'), 'Migration có index danh sách tài khoản');
expect(migration.includes('idx_official_teachers_name_trgm'), 'Migration có index tìm giáo viên');
expect(migration.includes('idx_official_classes_name_trgm'), 'Migration có index tìm/tên lớp');
expect(migration.includes('idx_official_students_class_status_name'), 'Migration có index roster lớp');

const versionValues = [...index.matchAll(/v=(20phase[^"']+)/g)].map((match) => match[1]);
expect(versionValues.length > 0 && versionValues.every((value) => value === build), 'Toàn bộ asset query version đồng bộ');

// Phase 7L frontend bundle and asset improvements.
expect(moduleLoader.includes("classes: { file: 'classes.js', ready: 'classesPage' }"), 'Loader ánh xạ module Lớp học');
expect(moduleLoader.includes("schedule: { file: 'schedule.js', ready: 'schedulePage' }"), 'Loader ánh xạ module Lịch dạy');
expect(moduleLoader.includes("script.async = true"), 'Route module được tải bất đồng bộ');
expect(app.includes("window.MsRouteModules?.ensure(waitingRoute)"), 'Trang tự tải module khi người dùng mở route');
expect(app.includes("/v15/assets/logo-msgiang.webp"), 'Ứng dụng dùng logo WebP tối ưu');
expect(!app.includes('asset-aa296a04fdb9.png'), 'Không còn tham chiếu logo PNG lớn');
expect(fs.existsSync(path.join(root, 'public/v15/assets/logo-msgiang.webp')), 'File logo WebP tồn tại');
expect(!fs.existsSync(path.join(root, 'public/v15/assets/asset-aa296a04fdb9.png')), 'Logo PNG lớn đã được loại bỏ');
expect(fs.statSync(path.join(root, 'public/v15/assets/logo-msgiang.webp')).size < 60000, 'Logo WebP nhỏ hơn 60 KB');
expect(fs.statSync(path.join(root, 'public/v15/favicon.png')).size < 10000, 'Favicon nhỏ hơn 10 KB');

const packageVersions = { ...pkg.dependencies, ...pkg.devDependencies };
expect(Object.values(packageVersions).every((value) => value !== 'latest' && !String(value).includes('*')), 'Dependency đã khóa phiên bản cụ thể');

if (process.exitCode) {
  console.error('\nPhase 7L audit thất bại. Không nên deploy.');
  process.exit(process.exitCode);
}
console.log('\nPhase 7L audit đạt.');
