// Node HTTP adapter for the API. Bundled to api/index.js for Vercel, and mounted by Vite in development.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { SEED_CATALOG } from '../src/seed';
import { handle, type ApiRequest } from './app';
import { storeFromEnv } from './store';

const MAX_BODY = 64 * 1024;

async function readBody(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  // Vercel may have parsed the JSON body already.
  if (req.body !== undefined) return typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) return undefined;
    chunks.push(chunk as Buffer);
  }
  return chunks.length ? safeJson(Buffer.concat(chunks).toString('utf8')) : undefined;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index > 0) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const forwarded = first(req.headers['x-forwarded-for'])?.split(',')[0].trim();
  const request: ApiRequest = {
    method: (req.method ?? 'GET').toUpperCase(),
    path: url.pathname.replace(/^\/api/, '') || '/',
    query: url.searchParams,
    body: req.method === 'GET' ? undefined : await readBody(req),
    cookies: parseCookies(req.headers.cookie),
    ip: forwarded || req.socket.remoteAddress || 'unknown',
    origin: first(req.headers.origin),
    host: first(req.headers['x-forwarded-host']) ?? req.headers.host,
    contentType: req.headers['content-type'],
    secure: first(req.headers['x-forwarded-proto']) === 'https',
  };

  const response = await handle(request, storeFromEnv(), {
    seed: SEED_CATALOG,
    adminEmails: (process.env.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
    adminSetupCode: process.env.ADMIN_SETUP_CODE || undefined,
  });

  res.statusCode = response.status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  if (response.cookies?.length) res.setHeader('set-cookie', response.cookies);
  res.end(JSON.stringify(response.body));
}
