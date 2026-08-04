import fs from 'node:fs';
import vm from 'node:vm';

const actions = fs.readFileSync('public/v15/modules/schedule-actions.js','utf8');
const route = fs.readFileSync('app/api/schedule/tutoring/route.ts','utf8');

if (!actions.includes('function tutoringTodayVNISO()') || !actions.includes('const today=tutoringTodayVNISO();')) {
  throw new Error('Form Học kèm chưa dùng ngày Việt Nam');
}
if (route.includes('months.length !== 1') || route.includes('Chỉ chọn học sinh cùng một tháng học bù')) {
  throw new Error('API vẫn chặn lượt vắng từ nhiều tháng');
}
if (!route.includes('for (const monthKey of months)') || !route.includes('safeMonthDeleted(supabase, String(monthKey))')) {
  throw new Error('API chưa kiểm tra từng tháng tồn đọng');
}
if (!route.includes('canManage(user)') || !route.includes('hasRole(user, "teacher")')) {
  throw new Error('Quyền Quản lí/Giáo viên tạo lớp Học kèm bị thiếu');
}

const start = actions.indexOf('function tutoringTodayVNISO()');
const end = actions.indexOf('\n\n    function tutoringPendingRows()', start);
if (start < 0 || end < 0) throw new Error('Không tách được helper ngày Việt Nam');
const source = `${actions.slice(start,end)}\nresult=tutoringTodayVNISO();`;
const sandbox = { Date, result: '' };
vm.runInNewContext(source, sandbox);
if (!/^\d{4}-\d{2}-\d{2}$/.test(sandbox.result)) throw new Error('Ngày Việt Nam không đúng định dạng');

console.log('Phase 8D.4.10 tutoring today + cross-month smoke đạt.');
