(function bootstrapMsgiangRouteModules(global) {
  'use strict';

  var BUILD_VERSION = '20phase8d4-startup-css-network-cleanup';
  var ROUTE_MODULES = Object.freeze({
    overview: { file: 'dashboard.js', ready: 'overview', styles: ['dashboard.css'] },
    reportImages: { file: 'report-images.js', ready: 'openGeneratedImageModal', styles: ['report.css'] },
    studentTransfer: { file: 'student-transfer.js', ready: 'openStudentTransferModal', styles: ['transfer.css'] },
    classesRuntime: { file: 'classes-runtime.js', ready: 'openClassDetail', styles: ['classes.css'] },
    classes: { file: 'classes.js', ready: 'classesPage', dependencies: ['classesRuntime'], styles: ['classes.css'] },
    attendanceRuntime: { file: 'attendance-runtime.js', ready: 'saveAttendance', styles: ['schedule.css'] },
    attendancePopup: { file: 'attendance-modal.js', ready: 'openAttendance', dependencies: ['attendanceRuntime', 'makeup'], styles: ['schedule.css'] },
    makeup: { file: 'makeup.js', ready: 'makeupPage', styles: ['schedule.css'] },
    scheduleActions: { file: 'schedule-actions.js', ready: 'openScheduleMakeup', dependencies: ['makeup'], styles: ['schedule.css'] },
    schedule: { file: 'schedule.js', ready: 'schedulePage', dependencies: ['attendancePopup', 'classesRuntime', 'scheduleActions'], styles: ['schedule.css'] },
    tuition: { file: 'tuition.js', ready: 'tuitionPage', dependencies: ['reportImages'], styles: ['tuition.css'] },
    homeworkRuntime: { file: 'homework-library-runtime.js', ready: 'ensureHomework', styles: ['library.css'] },
    homework: { file: 'library.js', ready: 'homeworkPage', dependencies: ['homeworkRuntime'], styles: ['library.css'] },
    evaluation: { file: 'evaluation.js', ready: 'evaluationPage', dependencies: ['reportImages'], styles: ['evaluation.css'] },
    teachers: { file: 'staff.js', ready: 'teachersPage', styles: ['staff.css'] },
    settings: { file: 'settings.js', ready: 'settingsPage', dependencies: ['teachers'], styles: ['settings.css'] }
  });
  var pending = new Map();
  var stylePending = new Map();

  function configFor(route) {
    return ROUTE_MODULES[String(route || '')] || null;
  }

  function isReady(route) {
    var config = configFor(route);
    return !config || typeof global[config.ready] === 'function';
  }

  function loadStyle(file) {
    var key = String(file || '');
    if (!key) return Promise.resolve(true);
    if (stylePending.has(key)) return stylePending.get(key);
    var selector = 'link[data-msgiang-route-style="' + key + '"]';
    var existing = document.querySelector(selector);
    if (existing && (existing.dataset.msgiangLoaded === 'true' || existing.sheet)) return Promise.resolve(true);

    var promise = new Promise(function loadRouteStyle(resolve, reject) {
      var link = existing || document.createElement('link');
      function finish() {
        link.dataset.msgiangLoaded = 'true';
        resolve(true);
      }
      function fail() {
        if (!existing) link.remove();
        reject(new Error('Không tải được style ' + key));
      }
      link.addEventListener('load', finish, { once: true });
      link.addEventListener('error', fail, { once: true });
      if (!existing) {
        link.rel = 'stylesheet';
        link.href = '/v15/styles/' + key + '?v=' + encodeURIComponent(BUILD_VERSION);
        link.dataset.msgiangRouteStyle = key;
        document.head.appendChild(link);
      }
    }).finally(function () { stylePending.delete(key); });
    stylePending.set(key, promise);
    return promise;
  }

  function ensureStyles(config) {
    var styles = Array.isArray(config && config.styles) ? config.styles : [];
    return Promise.all(styles.map(loadStyle));
  }

  function loadOwn(key, config) {
    if (isReady(key)) return Promise.resolve(true);
    var selector = 'script[data-msgiang-route-module="' + key + '"]';
    var existing = document.querySelector(selector);
    return new Promise(function loadRouteModule(resolve, reject) {
      function finish() {
        if (isReady(key)) resolve(true);
        else reject(new Error('Module ' + key + ' đã tải nhưng không khởi tạo đúng'));
      }
      if (existing) {
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', function () { reject(new Error('Không tải được module ' + key)); }, { once: true });
        return;
      }
      var script = document.createElement('script');
      script.src = '/v15/modules/' + config.file + '?v=' + encodeURIComponent(BUILD_VERSION);
      script.async = true;
      script.dataset.msgiangRouteModule = key;
      script.onload = finish;
      script.onerror = function () {
        script.remove();
        reject(new Error('Không tải được module ' + key));
      };
      document.head.appendChild(script);
    });
  }

  function ensure(route) {
    var key = String(route || '');
    var config = configFor(key);
    if (!config) return Promise.resolve(true);
    if (isReady(key)) return ensureStyles(config).then(function () { return true; });
    if (pending.has(key)) return pending.get(key);

    var dependencies = Array.isArray(config.dependencies) ? config.dependencies : [];
    var promise = Promise.all(dependencies.map(ensure))
      .then(function () { return ensureStyles(config); })
      .then(function () { return loadOwn(key, config); })
      .finally(function () { pending.delete(key); });
    pending.set(key, promise);
    return promise;
  }

  function preload(routes) {
    var list = Array.isArray(routes) ? routes : [];
    var run = function () { list.forEach(function (route) { ensure(route).catch(function () {}); }); };
    if ('requestIdleCallback' in global) global.requestIdleCallback(run, { timeout: 1800 });
    else global.setTimeout(run, 700);
  }

  global.MsRouteModules = Object.freeze({
    buildVersion: BUILD_VERSION,
    ensure: ensure,
    isReady: isReady,
    preload: preload
  });
})(window);
