/* Poker Night — the server. One function for all of /api.
 * It owns the three things the page must not do itself: creating accounts, checking passwords and
 * knowing who is asking. Everything else is handed to core.js, the same rules the page runs
 * on its own when nobody is signed in.
 *
 * Needs an Upstash Redis database (KV_REST_API_URL + KV_REST_API_TOKEN). Run locally it keeps
 * everything in memory instead.
 */
'use strict';
const crypto = require('node:crypto');
const Core = require('../core.js');

const SESSION_COOKIE = 'pn_session';
const SESSION_SECONDS = 60 * 60 * 24 * 90;
const MAX_BODY = 64 * 1024;
const K = Core.K;
const cred = (id) => 'pn:cred:' + id; // salt + password hash; never read by core.js
const session = (hashed) => 'pn:session:' + hashed;

class UpstashStore {
  constructor(url, token) {
    this.url = url.replace(/\/$/, '');
    this.token = token;
  }
  async post(path, body) {
    const response = await fetch(this.url + path, {
      method: 'POST',
      headers: { authorization: 'Bearer ' + this.token, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('storage request failed with ' + response.status);
    return response.json();
  }
  async cmd(...args) {
    const reply = await this.post('', args);
    if (reply.error) throw new Error(reply.error);
    return reply.result;
  }
  async pipeline(commands) {
    if (!commands.length) return [];
    const replies = await this.post('/pipeline', commands);
    return replies.map((reply) => {
      if (reply.error) throw new Error(reply.error);
      return reply.result;
    });
  }
}

/* Null on Vercel with no database connected, so the API can say so instead of losing data. */
function storeFromEnv(env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return new UpstashStore(url, token);
  if (env.VERCEL) return null;
  if (!globalThis.__pokerNightStore) globalThis.__pokerNightStore = new Core.MemoryStore();
  return globalThis.__pokerNightStore;
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
function rid(n) {
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
function derive(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const fail = (status, code, message) => { throw new ApiError(status, code, message); };

async function route(req, store) {
  if (!store) fail(503, 'storage_unavailable', 'Accounts aren’t set up on this server yet. You can still play on this phone.');
  if (req.method !== 'GET') {
    // Another site cannot send JSON here without asking first, and the Origin must be ours.
    if (!(req.contentType || '').includes('application/json')) fail(415, 'bad_content_type', 'That request isn’t valid.');
    if (req.origin && req.host && new URL(req.origin).host !== req.host) fail(403, 'bad_origin', 'That request isn’t valid.');
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const key = req.method + ' ' + req.path;

  const limit = async (bucket, max, seconds) => {
    const name = 'pn:rl:' + bucket;
    const count = await store.cmd('INCR', name);
    if (count === 1) await store.cmd('EXPIRE', name, seconds);
    if (count > max) fail(429, 'too_many', 'Too many tries. Give it a few minutes.');
  };
  const cookie = (token, maxAge) =>
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${req.secure ? '; Secure' : ''}`;
  const startSession = async (userId) => {
    const token = crypto.randomBytes(32).toString('base64url');
    await store.cmd('SET', session(sha256(token)), userId, 'EX', SESSION_SECONDS);
    return { status: 200, body: { ok: true }, cookies: [cookie(token, SESSION_SECONDS)] };
  };

  if (key === 'POST signup') {
    const name = Core.str(body.name, 24);
    const username = Core.str(body.username, 30).toLowerCase().replace(/^@/, '');
    const password = typeof body.password === 'string' ? body.password : '';
    if (!name) fail(400, 'bad_name', 'What should your friends call you?');
    if (!/^[a-z0-9_]{3,20}$/.test(username)) fail(400, 'bad_username', 'Usernames are 3 to 20 letters, numbers or underscores.');
    if (password.length < 8 || password.length > 200) fail(400, 'bad_password', 'Use a password of at least 8 characters.');
    await limit('signup:' + req.ip, 10, 3600);
    const id = 'u' + rid(16);
    const claimed = await store.cmd('SET', K.uname(username), id, 'NX');
    if (!claimed) fail(409, 'username_taken', 'That username is taken. Try another.');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = (await derive(password, salt)).toString('hex');
    const code = rid(12);
    await store.pipeline([
      ['SET', K.user(id), JSON.stringify({ id, username, name, code, createdAt: Date.now() })],
      ['SET', cred(id), JSON.stringify({ salt, hash })],
      ['SET', K.code(code), id],
    ]);
    return startSession(id);
  }

  if (key === 'POST login') {
    const username = Core.str(body.username, 30).toLowerCase().replace(/^@/, '');
    const password = typeof body.password === 'string' ? body.password : '';
    await limit('login:' + req.ip, 20, 600);
    await limit('login:' + sha256(username), 10, 600);
    const id = await store.cmd('GET', K.uname(username));
    let saved = null;
    try { saved = id ? JSON.parse(await store.cmd('GET', cred(id))) : null; } catch (e) { saved = null; }
    // Derive even when there is no such account, so both cases take about as long.
    const derived = await derive(password, saved ? saved.salt : 'no-such-user');
    const matches = saved !== null && crypto.timingSafeEqual(derived, Buffer.from(saved.hash, 'hex'));
    if (!matches) fail(401, 'bad_login', 'That username and password don’t match.');
    return startSession(id);
  }

  const token = req.cookies[SESSION_COOKIE];
  if (key === 'POST logout') {
    if (token) await store.cmd('DEL', session(sha256(token)));
    return { status: 200, body: { ok: true }, cookies: [cookie('', 0)] };
  }

  const userId = token ? await store.cmd('GET', session(sha256(token))) : null;
  if (!userId) fail(401, 'signed_out', 'Sign in to carry on.');
  const core = Core.createCore({ store, rid });
  return core.handle(userId, req.method, req.path, body);
}

async function handle(req, store) {
  try {
    return await route(req, store);
  } catch (error) {
    if (error instanceof ApiError) return { status: error.status, body: { error: { code: error.code, message: error.message } } };
    console.error('Poker Night API error', error);
    return { status: 500, body: { error: { code: 'server_error', message: 'Something went wrong on our side. Try again in a moment.' } } };
  }
}

function safeJson(text) {
  try { return JSON.parse(text); } catch (e) { return undefined; }
}
async function readBody(req) {
  // Vercel may have parsed the JSON body already.
  if (req.body !== undefined) return typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) return undefined;
    chunks.push(chunk);
  }
  return chunks.length ? safeJson(Buffer.concat(chunks).toString('utf8')) : undefined;
}
function parseCookies(header) {
  const cookies = {};
  for (const part of (header || '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0) {
      try { cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim()); } catch (e) { /* skip a mangled cookie */ }
    }
  }
  return cookies;
}
const first = (value) => (Array.isArray(value) ? value[0] : value);

module.exports = async function handler(req, res) {
  const url = new URL(req.url || '/', 'http://localhost');
  const forwarded = (first(req.headers['x-forwarded-for']) || '').split(',')[0].trim();
  const method = (req.method || 'GET').toUpperCase();
  const response = await handle({
    method,
    path: url.pathname.replace(/^\/api\/?/, '').replace(/\/+$/, ''),
    body: method === 'GET' ? undefined : await readBody(req),
    cookies: parseCookies(req.headers.cookie),
    ip: forwarded || (req.socket && req.socket.remoteAddress) || 'unknown',
    origin: first(req.headers.origin),
    host: first(req.headers['x-forwarded-host']) || req.headers.host,
    contentType: req.headers['content-type'],
    secure: first(req.headers['x-forwarded-proto']) === 'https',
  }, storeFromEnv(process.env));

  res.statusCode = response.status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  if (response.cookies && response.cookies.length) res.setHeader('set-cookie', response.cookies);
  res.end(JSON.stringify(response.body));
};
module.exports.handle = handle; // for tests
