# Phase 6 Realtime redeploy v2

Build marker: `20phase6rt2`

This package keeps all Phase 5B and Phase 6 functionality and adds deployment diagnostics:

- `/api/version` returns the deployed application build.
- `/deployment-version.json` provides a static no-cache marker.
- `window.MSGIANG_BUILD_VERSION` identifies the loaded frontend.
- `/v15/realtime-bootstrap.js` ensures `window.msgiangRealtime` exists as soon as the Phase 6 HTML is loaded.
- All first-party CSS/JS asset URLs use the unique `20phase6rt2` cache key.

Expected browser checks:

```js
document.querySelector('meta[name="msgiang-build"]')?.content
window.MSGIANG_BUILD_VERSION
window.msgiangRealtime.status()
```
