(function bootstrapSmartWarmup(global) {
  'use strict';

  var BUILD_VERSION = '20phase8d4-3-tuition-message-cleanup';
  var backgroundTimer = null;
  var generation = 0;
  var inflight = new Map();
  var warmedAt = new Map();
  var WARM_RECENT_MS = 90 * 1000;
  var BACKGROUND_DELAY_MS = 1400;
  var GAP_MS = 260;

  function bridge() {
    return global.MsAppWarmupBridge || null;
  }

  function connectionIsConstrained() {
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return false;
    if (connection.saveData) return true;
    return /(^|-)2g$|slow-2g/i.test(String(connection.effectiveType || ''));
  }

  function canRunBackground() {
    var api = bridge();
    if (!api || !api.isAuthenticated()) return false;
    if (document.visibilityState === 'hidden') return false;
    if (api.isModalOpen()) return false;
    if (connectionIsConstrained()) return false;
    return true;
  }

  function plan() {
    var api = bridge();
    if (!api) return [];
    var flags = api.roleFlags();
    var routes;
    if (flags.admin || flags.manager) routes = ['teachers', 'homework', 'evaluation', 'tuition'];
    else if (flags.receptionist) routes = ['teachers', 'homework', 'evaluation'];
    else routes = ['homework', 'evaluation'];
    var allowed = api.availableRoutes();
    return routes.filter(function (route) {
      if (!allowed.has(route)) return false;
      if (route === 'tuition' && !api.canViewTuition()) return false;
      return true;
    });
  }

  function warmRoute(route, source) {
    var api = bridge();
    route = String(route || '');
    source = source || 'intent';
    if (!api || !api.isAuthenticated() || !route) return Promise.resolve(false);
    if (!api.availableRoutes().has(route)) return Promise.resolve(false);
    if (route === 'tuition' && !api.canViewTuition()) return Promise.resolve(false);
    if (source === 'background' && !canRunBackground()) return Promise.resolve(false);

    var recent = warmedAt.get(route) || 0;
    if (Date.now() - recent < WARM_RECENT_MS) return Promise.resolve(true);
    if (inflight.has(route)) return inflight.get(route);

    var task = Promise.resolve()
      .then(function () {
        api.hydrate(route);
        return Promise.allSettled([
          global.MsRouteModules ? global.MsRouteModules.ensure(route) : Promise.resolve(true),
          api.ensureData(route, { prefetch: true, warmup: true })
        ]);
      })
      .then(function (results) {
        var moduleFailed = results[0] && results[0].status === 'rejected';
        if (moduleFailed || !api.isDataReady(route)) throw (results[0] && results[0].reason) || new Error('Dữ liệu warm-up chưa sẵn sàng');
        warmedAt.set(route, Date.now());
        api.renderIfActive(route);
        return true;
      })
      .catch(function (error) {
        console.warn('Smart warm-up failed', route, error);
        return false;
      })
      .finally(function () {
        inflight.delete(route);
      });

    inflight.set(route, task);
    return task;
  }

  function runIdle(fn) {
    if ('requestIdleCallback' in global) global.requestIdleCallback(fn, { timeout: 1800 });
    else global.setTimeout(fn, 0);
  }

  async function runBackground(runId) {
    if (!canRunBackground()) return;
    var routes = plan();
    if (global.MsRouteModules) {
      await Promise.allSettled(routes.map(function (route) { return global.MsRouteModules.ensure(route); }));
    }
    for (var i = 0; i < routes.length; i += 1) {
      if (runId !== generation || !canRunBackground()) break;
      await warmRoute(routes[i], 'background');
      if (i < routes.length - 1) await new Promise(function (resolve) { global.setTimeout(resolve, GAP_MS); });
    }
  }

  function schedule(reason) {
    clearTimeout(backgroundTimer);
    var runId = ++generation;
    backgroundTimer = global.setTimeout(function () {
      if (runId !== generation) return;
      runIdle(function () { runBackground(runId); });
    }, BACKGROUND_DELAY_MS);
    return reason || 'scheduled';
  }

  function routeFromEvent(event) {
    var target = event.target && event.target.closest ? event.target.closest('[data-route]') : null;
    return target ? target.getAttribute('data-route') : '';
  }

  document.addEventListener('pointerover', function (event) {
    var route = routeFromEvent(event);
    if (route) warmRoute(route, 'intent');
  }, { passive: true });

  document.addEventListener('focusin', function (event) {
    var route = routeFromEvent(event);
    if (route) warmRoute(route, 'intent');
  });

  document.addEventListener('touchstart', function (event) {
    var route = routeFromEvent(event);
    if (route) warmRoute(route, 'intent');
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') schedule('visible');
  });

  global.MsSmartWarmup = Object.freeze({
    buildVersion: BUILD_VERSION,
    schedule: schedule,
    warmRoute: warmRoute,
    status: function () {
      return {
        inflight: Array.from(inflight.keys()),
        warmed: Array.from(warmedAt.entries()),
        constrained: connectionIsConstrained()
      };
    }
  });
})(window);
