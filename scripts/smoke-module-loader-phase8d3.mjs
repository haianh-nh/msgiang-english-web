import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const scripts = new Map();
const loadOrder = [];
const context = {
  console, Map, Set, Promise, Object, Array, String, Number, Boolean, Date, Math, Error,
  encodeURIComponent, setTimeout, clearTimeout,
};
context.window = context;
context.globalThis = context;
context.document = {
  querySelector(selector) { return scripts.get(selector) || null; },
  createElement() {
    return { dataset: {}, addEventListener(type, fn) { this[`on${type}`] = fn; }, remove() {} };
  },
  head: {
    appendChild(script) {
      const match = String(script.src || '').match(/\/v15\/modules\/([^?]+)/);
      if (!match) throw new Error(`Không hiểu script src: ${script.src}`);
      const key = script.dataset.msgiangRouteModule;
      scripts.set(`script[data-msgiang-route-module="${key}"]`, script);
      loadOrder.push(key);
      const file = path.join(root, 'public/v15/modules', match[1]);
      try {
        vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
        script.onload?.();
      } catch (error) { script.onerror?.(error); }
    },
  },
};
const sandbox = vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'public/v15/module-loader.js'), 'utf8'), sandbox, { filename: 'module-loader.js' });

for (const route of ['overview', 'schedule', 'classes', 'makeup', 'teachers', 'settings', 'homework', 'evaluation', 'tuition', 'studentTransfer']) {
  await sandbox.MsRouteModules.ensure(route);
  if (!sandbox.MsRouteModules.isReady(route)) throw new Error(`${route} chưa ready`);
}

const expected = [
  'overview', 'quickTodos',
  'schedulePage', 'openScheduleMakeup', 'openAttendance', 'saveAttendance',
  'classesPage', 'openClassDetail', 'makeupPage', 'teachersPage', 'settingsPage', 'homeworkPage',
  'evaluationPage', 'saveEvaluation', 'openEvaluationImage',
  'tuitionPage', 'markPaid', 'openTuitionImage', 'openGeneratedImageModal',
  'openStudentTransferModal',
];
for (const name of expected) {
  if (typeof sandbox[name] !== 'function') throw new Error(`${name} không nằm trên global context`);
}

const mustLoadBefore = (a, b) => {
  if (loadOrder.indexOf(a) < 0 || loadOrder.indexOf(b) < 0 || loadOrder.indexOf(a) > loadOrder.indexOf(b)) {
    throw new Error(`Sai thứ tự module: ${a} phải trước ${b}. Order=${loadOrder.join(',')}`);
  }
};
mustLoadBefore('reportImages', 'evaluation');
mustLoadBefore('reportImages', 'tuition');
mustLoadBefore('attendanceRuntime', 'attendancePopup');
mustLoadBefore('makeup', 'scheduleActions');
mustLoadBefore('classesRuntime', 'classes');
mustLoadBefore('scheduleActions', 'schedule');

console.log('Phase 8D.3 module-loader smoke đạt.');
