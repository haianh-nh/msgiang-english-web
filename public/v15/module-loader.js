(function bootstrapMsgiangRouteModules(global) {
  'use strict';

  var BUILD_VERSION = '20phase8d2-linked-runtime-module-split';
  var ROUTE_MODULES = Object.freeze({
    studentTransfer: { file: 'student-transfer.js', ready: 'openStudentTransferModal' },
    classesRuntime: { file: 'classes-runtime.js', ready: 'openClassDetail' },
    classes: { file: 'classes.js', ready: 'classesPage', dependencies: ['classesRuntime'] },
    attendanceRuntime: { file: 'attendance-runtime.js', ready: 'saveAttendance' },
    attendancePopup: { file: 'attendance-modal.js', ready: 'openAttendance', dependencies: ['attendanceRuntime', 'makeup'] },
    makeup: { file: 'makeup.js', ready: 'makeupPage' },
    scheduleActions: { file: 'schedule-actions.js', ready: 'openScheduleMakeup', dependencies: ['makeup'] },
    schedule: { file: 'schedule.js', ready: 'schedulePage', dependencies: ['attendancePopup', 'classesRuntime', 'scheduleActions'] },
    tuition: { file: 'tuition.js', ready: 'tuitionPage' },
    homeworkRuntime: { file: 'homework-library-runtime.js', ready: 'ensureHomework' },
    homework: { file: 'library.js', ready: 'homeworkPage', dependencies: ['homeworkRuntime'] },
    evaluation: { file: 'evaluation.js', ready: 'evaluationPage' },
    teachers: { file: 'staff.js', ready: 'teachersPage' },
    settings: { file: 'settings.js', ready: 'settingsPage', dependencies: ['teachers'] }
  });
  var pending = new Map();

  function configFor(route) {
    return ROUTE_MODULES[String(route || '')] || null;
  }

  function isReady(route) {
    var config = configFor(route);
    return !config || typeof global[config.ready] === 'function';
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
    if (!config || isReady(key)) return Promise.resolve(true);
    if (pending.has(key)) return pending.get(key);

    var dependencies = Array.isArray(config.dependencies) ? config.dependencies : [];
    var promise = Promise.all(dependencies.map(ensure))
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
