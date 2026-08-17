/* =============================================================================
 * sw.js — VENUS-OS service worker. Cache-first for the OS core so the desktop
 * boots instantly (and offline); network passthrough for everything heavy or
 * live. Bump VERSION on deploy to invalidate.
 * ===========================================================================*/

var VERSION = 'venus-os-v1';
var CORE = [
  '.', 'index.html', 'manifest.json',
  'css/tokens.css', 'css/os.css', 'css/apps.css',
  'assets/favicon.svg', 'assets/logo.jpg', 'assets/hero-terrain.webp',
  'js/venus-phase.js', 'js/venus-globe.js', 'js/terrain.js', 'js/icons.js',
  'js/coin.js', 'js/cabar.js', 'js/share.js', 'js/apps.js',
  'js/screensaver.js', 'js/vesper.js', 'js/os.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    /* addAll would fail the whole install on one 404; add individually */
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k !== VERSION) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   /* APIs, RPCs: straight through */
  if (url.pathname.endsWith('.mp4')) return;                                  /* stream, don't cache */

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
