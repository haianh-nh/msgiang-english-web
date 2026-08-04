import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const loaderSource = fs.readFileSync(path.join(root, 'public/v15/module-loader.js'), 'utf8');

function createSandbox({ failStyleOnce = '' } = {}) {
  const nodes = new Map();
  const loadOrder = [];
  const styleOrder = [];
  let pendingFailure = failStyleOnce;

  const context = {
    console, Map, Set, Promise, Object, Array, String, Number, Boolean, Date, Math, Error,
    encodeURIComponent, setTimeout, clearTimeout,
  };
  context.window = context;
  context.globalThis = context;
  context.document = {
    querySelector(selector) { return nodes.get(selector) || null; },
    createElement(tagName) {
      const node = {
        tagName: String(tagName || '').toUpperCase(), dataset: {}, sheet: null,
        addEventListener(type, fn) { this[`on${type}`] = fn; },
        remove() {
          for (const [selector, value] of nodes.entries()) if (value === this) nodes.delete(selector);
        },
      };
      return node;
    },
    head: {
      appendChild(node) {
        if (node.tagName === 'LINK') {
          const key = node.dataset.msgiangRouteStyle;
          nodes.set(`link[data-msgiang-route-style="${key}"]`, node);
          styleOrder.push(key);
          const file = path.join(root, 'public/v15/styles', key);
          if (!fs.existsSync(file)) return node.onerror?.(new Error(`Thiếu ${file}`));
          if (pendingFailure === key) {
            pendingFailure = '';
            return node.onerror?.(new Error(`Lỗi giả lập ${key}`));
          }
          node.sheet = {};
          node.onload?.();
          return;
        }
        const match = String(node.src || '').match(/\/v15\/modules\/([^?]+)/);
        if (!match) throw new Error(`Không hiểu script src: ${node.src}`);
        const key = node.dataset.msgiangRouteModule;
        nodes.set(`script[data-msgiang-route-module="${key}"]`, node);
        loadOrder.push(key);
        const file = path.join(root, 'public/v15/modules', match[1]);
        try {
          vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
          node.onload?.();
        } catch (error) { node.onerror?.(error); }
      },
    },
  };
  const sandbox = vm.createContext(context);
  vm.runInContext(loaderSource, sandbox, { filename: 'module-loader.js' });
  return { sandbox, nodes, loadOrder, styleOrder };
}

const main = createSandbox();
for (const route of ['overview', 'schedule', 'classes', 'makeup', 'teachers', 'settings', 'homework', 'evaluation', 'tuition', 'studentTransfer']) {
  await main.sandbox.MsRouteModules.ensure(route);
  if (!main.sandbox.MsRouteModules.isReady(route)) throw new Error(`${route} chưa ready`);
}

const expected = [
  'overview', 'quickTodos',
  'schedulePage', 'openScheduleMakeup', 'openAttendance', 'saveAttendance',
  'classesPage', 'openClassDetail', 'makeupPage', 'teachersPage', 'settingsPage', 'homeworkPage',
  'evaluationPage', 'saveEvaluation', 'openEvaluationImage',
  'tuitionPage', 'markPaid', 'openGeneratedImageModal',
  'openStudentTransferModal',
];
for (const name of expected) if (typeof main.sandbox[name] !== 'function') throw new Error(`${name} không nằm trên global context`);

const mustLoadBefore = (a, b) => {
  if (main.loadOrder.indexOf(a) < 0 || main.loadOrder.indexOf(b) < 0 || main.loadOrder.indexOf(a) > main.loadOrder.indexOf(b)) {
    throw new Error(`Sai thứ tự module: ${a} phải trước ${b}. Order=${main.loadOrder.join(',')}`);
  }
};
mustLoadBefore('reportImages', 'evaluation');
mustLoadBefore('attendanceRuntime', 'attendancePopup');
mustLoadBefore('makeup', 'scheduleActions');
mustLoadBefore('classesRuntime', 'classes');
mustLoadBefore('scheduleActions', 'schedule');

for (const style of ['dashboard.css','schedule.css','classes.css','staff.css','settings.css','library.css','evaluation.css','tuition.css','transfer.css','report.css']) {
  if (!main.styleOrder.includes(style)) throw new Error(`Style ${style} chưa được lazy-load`);
  if (main.styleOrder.filter((x) => x === style).length !== 1) throw new Error(`Style ${style} bị tải lặp`);
  const node = main.nodes.get(`link[data-msgiang-route-style="${style}"]`);
  if (!node || node.dataset.msgiangLoaded !== 'true') throw new Error(`Style ${style} chưa được đánh dấu loaded sau onload`);
}

// A failed stylesheet must be removed, reject once, and load successfully on the next ensure call.
const retry = createSandbox({ failStyleOnce: 'tuition.css' });
let rejected = false;
try { await retry.sandbox.MsRouteModules.ensure('tuition'); }
catch (error) { rejected = /tuition\.css/.test(String(error?.message || error)); }
if (!rejected) throw new Error('Lần tải tuition.css lỗi chưa reject đúng');
if (retry.nodes.has('link[data-msgiang-route-style="tuition.css"]')) throw new Error('Link tuition.css lỗi chưa được xóa');
await retry.sandbox.MsRouteModules.ensure('tuition');
if (!retry.sandbox.MsRouteModules.isReady('tuition')) throw new Error('Tuition không ready sau khi retry CSS');
if (retry.styleOrder.filter((x) => x === 'tuition.css').length !== 2) throw new Error('Tuition CSS chưa được tải lại đúng một lần');



// Staff cards and teacher popup must hide every tutoring support class.
const staffSource = fs.readFileSync(path.join(root, 'public/v15/modules/staff.js'), 'utf8');
const staffContext = {
  console, Map, Set, Promise, Object, Array, String, Number, Boolean, Date, Math, Error,
  setTimeout, clearTimeout,
  db: {
    teachers: [{ id: 't1', name: 'Ms Bích', phone: '0867915950', roles: ['teacher'], status: 'active' }],
    classes: [
      { id: 'c1', name: 'G2.2', grade: 'G2', teacherId: 't1', teacher: 'Ms Bích', time: '17:00' },
      { id: 'c2', name: 'Học kèm G2.2', grade: 'Học kèm', teacherId: 't1', teacher: 'Ms Bích' },
      { id: 'c3', name: 'Tutoring legacy', note: '__tutoring_session__', teacherId: 't1', teacher: 'Ms Bích' },
      { id: 'c4', name: 'Học kèm GK+G', teacherId: 't1', teacher: 'Ms Bích' },
      { id: 'c5', name: 'G3.1', grade: 'G3', taId: 't1', ta: 'Ms Bích', time: '18:30' },
      { id: 'c6', name: 'G4.1', grade: 'G4', teacherId: '', teacher: '', time: '19:00' },
      { id: 'c7', name: 'Lớp  học kèm G5', teacherId: 't1', teacher: 'Ms Bích' },
      { id: 'c8', name: 'Ca riêng', sessionKind: 'tutoring', teacherId: 't1', teacher: 'Ms Bích' },
      { id: 'c9', name: 'Ca hỗ trợ', sourceSessionKey: 'tutoring:c9', teacherId: 't1', teacher: 'Ms Bích' },
    ],
  },
  teacherRoleValue: () => 'teacher',
  h: (value) => String(value ?? ''),
  sortClassesByGrade: (rows) => [...rows],
  isClassEnded: () => false,
};
staffContext.window = staffContext;
staffContext.globalThis = staffContext;
const staffSandbox = vm.createContext(staffContext);
vm.runInContext(staffSource, staffSandbox, { filename: 'staff.js' });
const mainClassNames = vm.runInContext("mainClassesOfTeacher(db.teachers[0]).map(c=>c.name)", staffSandbox);
if (JSON.stringify(Array.from(mainClassNames)) !== JSON.stringify(['G2.2', 'G3.1'])) {
  throw new Error(`Lọc lớp chính sai: ${JSON.stringify(Array.from(mainClassNames))}`);
}
const staffCard = vm.runInContext("teacherCard(db.teachers[0],0)", staffSandbox);
if (!staffCard.includes('2 lớp') || !staffCard.includes('G2.2') || !staffCard.includes('G3.1')) {
  throw new Error('Thẻ giáo viên chưa hiển thị đúng số lượng/tên lớp chính');
}
const teacherPanel = vm.runInContext("v7hTeacherClassPanelMarkup(db.teachers[0])", staffSandbox);
if (!teacherPanel.includes('2 lớp') || !teacherPanel.includes('G2.2') || !teacherPanel.includes('G3.1')) {
  throw new Error('Popup giáo viên chưa hiển thị đúng danh sách lớp chính');
}
if (!teacherPanel.includes('G4.1')) throw new Error('Dropdown gán lớp đã làm mất lớp chính chưa được gán');
for (const markup of [staffCard, teacherPanel]) {
  if (/Học kèm|Tutoring legacy|Lớp\s+ học kèm|Ca riêng|Ca hỗ trợ/i.test(markup)) {
    throw new Error('Giao diện nhân sự vẫn còn hiển thị lớp Học kèm');
  }
}

console.log('Phase 8D.4.9 module-loader + staff tutoring visibility smoke đạt.');
