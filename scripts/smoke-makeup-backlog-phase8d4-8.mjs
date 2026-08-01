import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const moduleSource = fs.readFileSync(path.join(root, 'public/v15/modules/makeup.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'public/v15/app.js'), 'utf8');
const scheduleSource = fs.readFileSync(path.join(root, 'public/v15/modules/schedule-actions.js'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'app/api/makeup/state/route.ts'), 'utf8');

const start = moduleSource.indexOf('function makeupTabPendingRows(state,monthKey){');
const end = moduleSource.indexOf('\nfunction makeupTabCompletedRows', start);
if (start < 0 || end < 0) throw new Error('Không tìm thấy makeupTabPendingRows');
const pendingFunction = moduleSource.slice(start, end);

const students = new Map([
  ['s-jul', { id: 's-jul', name: 'Học sinh tháng 7' }],
  ['s-aug', { id: 's-aug', name: 'Học sinh tháng 8' }],
  ['s-jun', { id: 's-jun', name: 'Học sinh tháng 6' }],
  ['s-done', { id: 's-done', name: 'Đã xếp' }],
]);
const classes = new Map([
  ['c1', { id: 'c1', name: 'G3.1' }],
  ['c2', { id: 'c2', name: 'G4.1' }],
]);
const deleted = new Set(['2026-06']);
const state = {
  absenceRecords: [
    { id: 'a-jul', studentId: 's-jul', sourceClassId: 'c1', sourceSessionKey: 'c1|2026-07-28|Tue|17:00-18:30', status: 'pending' },
    { id: 'a-aug', studentId: 's-aug', sourceClassId: 'c2', sourceSessionKey: 'c2|2026-08-02|Sun|17:00-18:30', status: 'pending' },
    { id: 'a-jun', studentId: 's-jun', sourceClassId: 'c1', sourceSessionKey: 'c1|2026-06-20|Sat|17:00-18:30', status: 'pending' },
    { id: 'a-done', studentId: 's-done', sourceClassId: 'c1', sourceSessionKey: 'c1|2026-07-20|Mon|17:00-18:30', status: 'scheduled' },
  ],
};
const statusById = new Map(state.absenceRecords.map((row) => [row.id, row.status]));
const context = {
  console, String, Array, Object, Map, Set,
  makeupMonthDeleted: (month) => deleted.has(String(month || '')),
  absenceRecordMonth: (row) => String(row?.sourceSessionKey || '').split('|')[1]?.slice(0, 7) || '',
  makeupTabAbsenceRecordStatus: (id) => statusById.get(String(id)) || 'pending',
  studentById: (id) => students.get(String(id)) || {},
  classById: (id) => classes.get(String(id)) || {},
  sessionObjectFromKey: () => null,
};
context.window = context;
context.globalThis = context;
const sandbox = vm.createContext(context);
vm.runInContext(`${pendingFunction}; globalThis.pendingRows = makeupTabPendingRows;`, sandbox);

const all = Array.from(sandbox.pendingRows(state, null));
if (all.length !== 2 || !all.some((x) => x.record.id === 'a-jul') || !all.some((x) => x.record.id === 'a-aug')) {
  throw new Error(`Backlog mọi tháng sai: ${all.map((x) => x.record.id).join(',')}`);
}
if (all.some((x) => x.record.id === 'a-jun') || all.some((x) => x.record.id === 'a-done')) {
  throw new Error('Backlog vẫn chứa tháng đã xóa hoặc lượt đã xếp');
}
const august = Array.from(sandbox.pendingRows(state, '2026-08'));
if (august.length !== 1 || august[0].record.id !== 'a-aug') {
  throw new Error(`Lọc tháng chi tiết sai: ${august.map((x) => x.record.id).join(',')}`);
}

if (!apiSource.includes('.eq("status", "pending")') || !apiSource.includes('pendingScope: "all-open-months"')) {
  throw new Error('API chưa tải backlog pending toàn bộ tháng');
}
if (!apiSource.includes('blockedAbsenceIds') || !apiSource.includes('["scheduled", "completed"]')) {
  throw new Error('API chưa chống lượt pending giả đã có plan');
}
if (!appSource.includes('return pendingMakeupRows(null)')) {
  throw new Error('Popup xếp học bù vẫn giới hạn theo tháng đích');
}
if ((scheduleSource.match(/pendingMakeupRows\(null\)/g) || []).length < 2) {
  throw new Error('Popup lịch dạy chưa dùng backlog mọi tháng ở cả mở và refresh');
}
if (!scheduleSource.includes('return makeupTabPendingRows(st,null);')) {
  throw new Error('Popup lớp học kèm vẫn giới hạn theo tháng');
}

console.log('Phase 8D.4.8 cross-month makeup backlog smoke đạt.');
