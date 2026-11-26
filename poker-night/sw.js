/* Poker Night — offline support.
 * The whole app is a handful of files, so they are all kept on the phone. Each one is served from
 * that copy straight away and refreshed in the background, so a new version shows up on the next open.
 * Bump VERSION with every release, together with version.js, which is what the home screen shows.
 */
var VERSION = 'poker-night-v13';
var SHELL = [
  './',
  'app.css',
  'version.js',
  'solver.js',
  'core.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'fonts/besley-latin-wght-normal.woff2',
  'fonts/besley-latin-ext-wght-normal.woff2',
  'fonts/hanken-grotesk-latin-wght-normal.woff2',
  'fonts/hanken-grotesk-latin-ext-wght-normal.woff2',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) { return cache.addAll(SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url = new URL(req.url);
  // Only the app's own files are kept. Anything from /api is live data and always goes to the network.
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.indexOf('/api/') >= 0) return;
  event.respondWith(
    caches.open(VERSION).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        var fresh = fetch(req).then(function (res) {
          if (res && res.ok && !res.redirected) cache.put(req, res.clone());
          return res;
        });
        if (hit) {
          event.waitUntil(fresh.catch(function () { /* offline: the saved copy is enough */ }));
          return hit;
        }
        return fresh.catch(function () {
          return req.mode === 'navigate' ? cache.match('./') : Response.error();
        });
      });
    })
  );
});
