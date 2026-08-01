import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'public/v15/app.js'), 'utf8');
const classes = fs.readFileSync(path.join(root, 'lib/classes.ts'), 'utf8');
const saveRoute = fs.readFileSync(path.join(root, 'app/api/attendance/save/route.ts'), 'utf8');

const dateFn = app.match(/function dateTimeForSession\(s,field\)\{[\s\S]*?\n    \}/)?.[0];
if (!dateFn) throw new Error('Không tìm thấy dateTimeForSession');

const context = {
  Date,
  Number,
  String,
  parseISODate(value) {
    const [y,m,d] = String(value).split('-').map(Number);
    return new Date(y,m-1,d);
  },
  isoDate(d) {
    return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  },
  dayDateFor() { return new Date(2026, 7, 3); },
};
vm.createContext(context);
vm.runInContext(`${dateFn}; globalThis.testDateTimeForSession=dateTimeForSession;`, context);
const d = context.testDateTimeForSession({ date:'2026-08-01', day:'Sat', start:'17:00' }, 'start');
if (d.toISOString() !== '2026-08-01T10:00:00.000Z') {
  throw new Error(`Sai quy đổi giờ Việt Nam: ${d.toISOString()}`);
}

if (!classes.includes('teacherIdentitiesForUser') || classes.includes('.eq("user_id", user.id)\n      .maybeSingle()')) {
  throw new Error('teacher identity resolver chưa chống dữ liệu trùng');
}
if (!saveRoute.includes('teacher_profile_not_linked') || !saveRoute.includes('teacher_not_assigned')) {
  throw new Error('API điểm danh chưa có mã lỗi chẩn đoán quyền');
}
if (!saveRoute.includes('.in("teacher_id", teacherIds)')) {
  throw new Error('Quyền điểm danh dạy bù chưa dùng toàn bộ teacher identities');
}

console.log('Phase 8D.4.8 teacher attendance smoke đạt.');
