(function bootstrapMsgiangNetworkRuntime(global) {
  'use strict';

  var BUILD_VERSION = '20phase8d4-4-tuition-search-reset';
  var GET_TTL_MS = 1800;
  var inflightGet = new Map();
  var shortGetCache = new Map();

  function cloneJson(data) {
    if (data == null) return data;
    try { return structuredClone(data); }
    catch (error) {
      try { return JSON.parse(JSON.stringify(data)); }
      catch (_) { return data; }
    }
  }

  function canDedupe(path, options) {
    var input = options || {};
    var method = String(input.method || 'GET').toUpperCase();
    return method === 'GET' && !input.body && !input.noDedupe && String(path || '').startsWith('/api/');
  }

  function cacheKey(path) {
    return String(path || '');
  }

  function clear() {
    shortGetCache.clear();
  }

  function clearMatching(prefixes) {
    var list = (Array.isArray(prefixes) ? prefixes : [prefixes]).map(String).filter(Boolean);
    if (!list.length) return;
    Array.from(shortGetCache.keys()).forEach(function (key) {
      if (list.some(function (prefix) { return String(key).startsWith(prefix); })) shortGetCache.delete(key);
    });
  }

  async function request(path, options) {
    var input = options || {};
    var preserveGetCache = !!input.preserveGetCache;
    var invalidatePaths = input.invalidatePaths;
    var noDedupe = !!input.noDedupe;
    var requestOptions = Object.assign({}, input);
    delete requestOptions.preserveGetCache;
    delete requestOptions.invalidatePaths;
    delete requestOptions.noDedupe;

    var headers = Object.assign({}, requestOptions.headers || {});
    if (!(requestOptions.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    var dedupe = canDedupe(path, Object.assign({}, requestOptions, { noDedupe: noDedupe }));
    var key = dedupe ? cacheKey(path) : '';

    if (dedupe) {
      var cached = shortGetCache.get(key);
      if (cached && Date.now() - cached.ts < GET_TTL_MS) return cloneJson(cached.data);
      var inflight = inflightGet.get(key);
      if (inflight) return cloneJson(await inflight);
    }

    var run = async function () {
      var res = await fetch(path, Object.assign({ credentials: 'include' }, requestOptions, { headers: headers }));
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(json.error || 'Lỗi hệ thống');
      if (dedupe) shortGetCache.set(key, { ts: Date.now(), data: json });
      else if (Array.isArray(invalidatePaths) && invalidatePaths.length) clearMatching(invalidatePaths);
      else if (!preserveGetCache) clear();
      return json;
    };

    if (dedupe) {
      var promise = run();
      inflightGet.set(key, promise);
      try { return cloneJson(await promise); }
      finally { inflightGet.delete(key); }
    }
    return run();
  }

  global.MsNetworkRuntime = Object.freeze({
    buildVersion: BUILD_VERSION,
    request: request,
    cloneJson: cloneJson,
    canDedupe: canDedupe,
    cacheKey: cacheKey,
    clear: clear,
    clearMatching: clearMatching,
    stats: function () { return { inflight: inflightGet.size, cached: shortGetCache.size }; }
  });
})(window);
