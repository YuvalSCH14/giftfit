/* Poker Night — local development server: the page plus the API, with everything kept in memory.
 *   node dev-server.js [port]
 * Set NO_API=1 to serve the page alone, the way a plain static host would.
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const api = require('./api/index.js');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    if (process.env.NO_API) { res.statusCode = 404; return res.end('Not found'); }
    return api(req, res).catch((error) => { console.error(error); res.statusCode = 500; res.end('{}'); });
  }
  const file = path.join(ROOT, path.normalize(pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(ROOT + path.sep)) { res.statusCode = 403; return res.end('Forbidden'); }
  fs.readFile(file, (error, data) => {
    if (error) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.setHeader('cache-control', 'no-cache');
    res.end(data);
  });
}).listen(PORT, () => console.log('Poker Night on http://localhost:' + PORT));
