(function bootstrapMsgiangRealtime(global) {
  'use strict';
  var BUILD_VERSION = '20phase7tuition';
  global.MSGIANG_BUILD_VERSION = BUILD_VERSION;
  global.__msgiangRealtimeBootstrapLoaded = true;

  if (!global.msgiangRealtime) {
    global.msgiangRealtime = {
      status: function status() {
        return {
          status: 'booting',
          reason: 'app_not_initialized',
          buildVersion: BUILD_VERSION
        };
      },
      reconnect: function reconnect() {
        return Promise.resolve(false);
      },
      disconnect: function disconnect() {
        return false;
      }
    };
  }
})(window);
