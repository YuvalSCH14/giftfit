/* Poker Night — offline support.
 * The whole app is a handful of files, so they are all kept on the phone. Each one is served from
 * that copy straight away and refreshed in the background, so a new version shows up on the next open.
 * Bump VERSION when a file is added or removed.
 */
var VERSION = 'poker-night-v1';
var SHELL = [
  './',
  'app.css',
  'solver.js',
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
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
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
