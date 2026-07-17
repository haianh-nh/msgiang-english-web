import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const nodes = new Map();
const loadOrder = [];
const styleOrder = [];
const context = {
  console, Map, Set, Promise, Object, Array, String, Number, Boolean, Date, Math, Error,
  encodeURIComponent, setTimeout, clearTimeout,
};
context.window = context;
context.globalThis = context;
context.document = {
  querySelector(selector) { return nodes.get(selector) || null; },
  createElement(tagName) {
    return {
      tagName: String(tagName || '').toUpperCase(), dataset: {}, sheet: null,
      addEventListener(type, fn) { this[`on${type}`] = fn; }, remove() {}
    };
  },
  head: {
    appendChild(node) {
      if (node.tagName === 'LINK') {
        const key = node.dataset.msgiangRouteStyle;
        nodes.set(`link[data-msgiang-route-style="${key}"]`, node);
        styleOrder.push(key);
        const file = path.join(root, 'public/v15/styles', key);
        if (!fs.existsSync(file)) return node.onerror?.(new Error(`Thiếu ${file}`));
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
for (const name of expected) if (typeof sandbox[name] !== 'function') throw new Error(`${name} không nằm trên global context`);

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

for (const style of ['dashboard.css','schedule.css','classes.css','staff.css','settings.css','library.css','evaluation.css','tuition.css','transfer.css','report.css']) {
  if (!styleOrder.includes(style)) throw new Error(`Style ${style} chưa được lazy-load`);
  if (styleOrder.filter(x => x === style).length !== 1) throw new Error(`Style ${style} bị tải lặp`);
}

console.log('Phase 8D.4 module-loader + lazy-style smoke đạt.');
