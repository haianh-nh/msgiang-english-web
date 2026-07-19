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

console.log('Phase 8D.4.4 module-loader + tuition-style retry smoke đạt.');
