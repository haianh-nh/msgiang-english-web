(function bootstrapMsgiangRouteModules(global) {
  'use strict';

  var BUILD_VERSION = '20phase7l1-smart-warmup-fast-tabs';
  var ROUTE_MODULES = Object.freeze({
    classes: { file: 'classes.js', ready: 'classesPage' },
    schedule: { file: 'schedule.js', ready: 'schedulePage' },
    attendance: { file: 'attendance.js', ready: 'attendancePage' },
    tuition: { file: 'tuition.js', ready: 'tuitionPage' },
    homework: { file: 'library.js', ready: 'homeworkPage' },
    evaluation: { file: 'evaluation.js', ready: 'evaluationPage' }
  });
  var pending = new Map();

  function configFor(route) {
    return ROUTE_MODULES[String(route || '')] || null;
  }

  function isReady(route) {
    var config = configFor(route);
    return !config || typeof global[config.ready] === 'function';
  }

  function ensure(route) {
    var key = String(route || '');
    var config = configFor(key);
    if (!config || isReady(key)) return Promise.resolve(true);
    if (pending.has(key)) return pending.get(key);

    var promise = new Promise(function loadRouteModule(resolve, reject) {
      var selector = 'script[data-msgiang-route-module="' + key + '"]';
      var existing = document.querySelector(selector);

      function finish() {
        pending.delete(key);
        if (isReady(key)) resolve(true);
        else reject(new Error('Module ' + key + ' đã tải nhưng không khởi tạo đúng'));
      }

      if (existing) {
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', function () {
          pending.delete(key);
          reject(new Error('Không tải được module ' + key));
        }, { once: true });
        return;
      }

      var script = document.createElement('script');
      script.src = '/v15/modules/' + config.file + '?v=' + encodeURIComponent(BUILD_VERSION);
      script.async = true;
      script.dataset.msgiangRouteModule = key;
      script.onload = finish;
      script.onerror = function () {
        pending.delete(key);
        script.remove();
        reject(new Error('Không tải được module ' + key));
      };
      document.head.appendChild(script);
    });

    pending.set(key, promise);
    return promise;
  }

  function preload(routes) {
    var list = Array.isArray(routes) ? routes : [];
    var run = function () {
      list.forEach(function (route) {
        ensure(route).catch(function () {});
      });
    };
    if ('requestIdleCallback' in global) global.requestIdleCallback(run, { timeout: 2500 });
    else global.setTimeout(run, 1200);
  }

  global.MsRouteModules = Object.freeze({
    buildVersion: BUILD_VERSION,
    ensure: ensure,
    isReady: isReady,
    preload: preload
  });
})(window);
