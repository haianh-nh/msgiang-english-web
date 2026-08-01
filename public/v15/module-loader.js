(function bootstrapMsgiangRouteModules(global) {
  'use strict';

  var BUILD_VERSION = '20phase8d4-8-cross-month-makeup-backlog';
  var STYLE_TIMEOUT_MS = 12000;
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
    tuition: { file: 'tuition.js', ready: 'tuitionPage', styles: ['tuition.css'] },
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

  function isModuleReady(route) {
    var config = configFor(route);
    return !config || typeof global[config.ready] === 'function';
  }

  function styleSelector(key) {
    return 'link[data-msgiang-route-style="' + key + '"]';
  }

  function isStyleLoaded(key) {
    var link = document.querySelector(styleSelector(key));
    return !!link && link.dataset.msgiangLoaded === 'true' && link.dataset.msgiangBuild === BUILD_VERSION;
  }

  function stylesReady(config) {
    var styles = Array.isArray(config && config.styles) ? config.styles : [];
    return styles.every(isStyleLoaded);
  }

  function isReady(route) {
    var config = configFor(route);
    return isModuleReady(route) && stylesReady(config);
  }

  function removeStyleLink(link) {
    if (!link) return;
    try { link.onload = null; link.onerror = null; } catch (_) {}
    try { link.remove(); } catch (_) {
      try { link.parentNode && link.parentNode.removeChild(link); } catch (_) {}
    }
  }

  function loadStyle(file) {
    var key = String(file || '');
    if (!key) return Promise.resolve(true);
    if (stylePending.has(key)) return stylePending.get(key);

    var existing = document.querySelector(styleSelector(key));
    if (existing && existing.dataset.msgiangBuild === BUILD_VERSION && existing.dataset.msgiangLoaded === 'true') {
      return Promise.resolve(true);
    }
    // Never treat an orphaned link as loaded merely because link.sheet exists.
    if (existing) removeStyleLink(existing);

    var promise = new Promise(function loadRouteStyle(resolve, reject) {
      var link = document.createElement('link');
      var settled = false;
      var timer = null;

      function cleanup() {
        if (timer) global.clearTimeout(timer);
        link.onload = null;
        link.onerror = null;
      }
      function finish() {
        if (settled) return;
        settled = true;
        cleanup();
        link.dataset.msgiangLoaded = 'true';
        link.dataset.msgiangStyleState = 'loaded';
        resolve(true);
      }
      function fail() {
        if (settled) return;
        settled = true;
        cleanup();
        link.dataset.msgiangLoaded = 'false';
        link.dataset.msgiangStyleState = 'error';
        removeStyleLink(link);
        reject(new Error('Không tải được style ' + key));
      }

      link.rel = 'stylesheet';
      link.href = '/v15/styles/' + key + '?v=' + encodeURIComponent(BUILD_VERSION);
      link.dataset.msgiangRouteStyle = key;
      link.dataset.msgiangBuild = BUILD_VERSION;
      link.dataset.msgiangLoaded = 'false';
      link.dataset.msgiangStyleState = 'loading';
      link.onload = finish;
      link.onerror = fail;
      timer = global.setTimeout(fail, STYLE_TIMEOUT_MS);
      document.head.appendChild(link);
    }).finally(function () { stylePending.delete(key); });

    stylePending.set(key, promise);
    return promise;
  }

  function ensureStyles(config) {
    var styles = Array.isArray(config && config.styles) ? config.styles : [];
    return Promise.all(styles.map(loadStyle));
  }

  function loadOwn(key, config) {
    if (isModuleReady(key)) return Promise.resolve(true);
    var selector = 'script[data-msgiang-route-module="' + key + '"]';
    var existing = document.querySelector(selector);
    return new Promise(function loadRouteModule(resolve, reject) {
      function finish() {
        if (isModuleReady(key)) resolve(true);
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
    if (isReady(key)) return Promise.resolve(true);
    if (pending.has(key)) return pending.get(key);

    var dependencies = Array.isArray(config.dependencies) ? config.dependencies : [];
    var promise = Promise.all(dependencies.map(ensure))
      .then(function () { return ensureStyles(config); })
      .then(function () { return loadOwn(key, config); })
      .then(function () {
        if (!isReady(key)) throw new Error('Chức năng ' + key + ' chưa sẵn sàng sau khi tải');
        return true;
      })
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
