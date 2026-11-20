// The GiftFit API as a pure function of (request, store, config), so it can be tested without HTTP.
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { OCCASIONS, RELATIONS, parseGift, type Gift, type Occasion, type Relation } from '../src/catalog';
import type { Bootstrap, Me, Rating, Reminder, Review } from '../src/api-types';
import type { Store } from './store';

export interface ApiRequest {
  method: string;
  /** Path after /api, e.g. "/auth/login". */
  path: string;
  query: URLSearchParams;
  body: unknown;
  cookies: Record<string, string>;
  ip: string;
  origin?: string;
  host?: string;
  contentType?: string;
  secure: boolean;
}

export interface ApiResponse {
  status: number;
  body: unknown;
  cookies?: string[];
}

export interface Config {
  seed: Gift[];
  adminEmails: string[];
  /** Required to register an account whose email is in adminEmails. */
  adminSetupCode?: string;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: string;
}

const SESSION_COOKIE = 'gf_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const MAX_CATALOG = 500;
const MAX_FAVORITES = 200;
const MAX_REMINDERS = 50;

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const fail = (status: number, code: string, message: string): never => {
  throw new ApiError(status, code, message);
};

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const str = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const field = (body: unknown, key: string): unknown =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined;

const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => (error ? reject(error) : resolve(key))),
  );

const sameText = (a: string, b: string) => {
  const left = Buffer.from(sha256(a));
  const right = Buffer.from(sha256(b));
  return timingSafeEqual(left, right);
};

const parseJson = <T>(raw: unknown, fallback: T): T => {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const pairs = (flat: unknown): [string, string][] => {
  const list = Array.isArray(flat) ? (flat as string[]) : [];
  const out: [string, string][] = [];
  for (let i = 0; i + 1 < list.length; i += 2) out.push([list[i], list[i + 1]]);
  return out;
};

export async function handle(req: ApiRequest, store: Store | null, config: Config): Promise<ApiResponse> {
  try {
    return await route(req, store, config);
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: error.status, body: { error: { code: error.code, message: error.message } } };
    }
    console.error('GiftFit API error', error);
    return { status: 500, body: { error: { code: 'server_error', message: 'משהו השתבש אצלנו. נסו שוב בעוד רגע.' } } };
  }
}

async function route(req: ApiRequest, maybeStore: Store | null, config: Config): Promise<ApiResponse> {
  const key = `${req.method} ${req.path.replace(/\/+$/, '') || '/'}`;

  if (!maybeStore) {
    // No database connected yet: the app still works on its own device with the built-in catalog.
    if (key === 'GET /bootstrap') {
      const body: Bootstrap = { storage: false, me: null, catalog: config.seed, favorites: [], reminders: [], ratings: {}, popular: [] };
      return { status: 200, body };
    }
    return fail(503, 'storage_unavailable', 'החשבונות עדיין לא זמינים. נסו שוב מאוחר יותר.');
  }
  const store = maybeStore;

  if (req.method !== 'GET') {
    // Cross-site requests cannot send JSON without a preflight, and the Origin must be ours.
    if (!req.contentType?.includes('application/json')) fail(415, 'bad_content_type', 'בקשה לא תקינה.');
    if (req.origin && req.host && new URL(req.origin).host !== req.host) fail(403, 'bad_origin', 'בקשה לא תקינה.');
  }

  const isAdminEmail = (email: string) => config.adminEmails.includes(email);
  const toMe = (user: UserRecord): Me => ({ name: user.name, email: user.email, isAdmin: isAdminEmail(user.email) });

  const currentUser = async (): Promise<UserRecord | null> => {
    const token = req.cookies[SESSION_COOKIE];
    if (!token) return null;
    const userId = await store.cmd<string | null>('GET', `session:${sha256(token)}`);
    if (!userId) return null;
    return parseJson<UserRecord | null>(await store.cmd('GET', `user:${userId}`), null);
  };
  const requireUser = async () => (await currentUser()) ?? fail(401, 'signed_out', 'צריך להתחבר כדי להמשיך.');
  const requireAdmin = async () => {
    const user = await requireUser();
    if (!isAdminEmail(user.email)) fail(403, 'not_admin', 'הפעולה זמינה רק למנהלי הקטלוג.');
    return user;
  };

  const limit = async (bucket: string, max: number, seconds: number) => {
    const name = `rl:${bucket}`;
    const count = await store.cmd<number>('INCR', name);
    if (count === 1) await store.cmd('EXPIRE', name, seconds);
    if (count > max) fail(429, 'too_many', 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.');
  };

  const loadCatalog = async (): Promise<{ catalog: Gift[]; custom: boolean }> => {
    const saved = parseJson<Gift[] | null>(await store.cmd('GET', 'catalog'), null);
    return Array.isArray(saved) ? { catalog: saved, custom: true } : { catalog: config.seed, custom: false };
  };

  const sessionCookie = (token: string, maxAge: number) =>
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${req.secure ? '; Secure' : ''}`;

  const startSession = async (user: UserRecord): Promise<ApiResponse> => {
    const token = randomBytes(32).toString('base64url');
    const hashed = sha256(token);
    await store.pipeline([
      ['SET', `session:${hashed}`, user.id, 'EX', SESSION_SECONDS],
      ['SADD', `sessions:${user.id}`, hashed],
    ]);
    return { status: 200, body: { me: toMe(user) }, cookies: [sessionCookie(token, SESSION_SECONDS)] };
  };

  const ratings = async (): Promise<Record<string, Rating>> => {
    const out: Record<string, Rating> = {};
    for (const [giftId, raw] of pairs(await store.cmd('HGETALL', 'ratings'))) {
      const rating = parseJson<Rating | null>(raw, null);
      if (rating && rating.count > 0) out[giftId] = rating;
    }
    return out;
  };

  const refreshRating = async (giftId: string) => {
    const all = pairs(await store.cmd('HGETALL', `reviews:${giftId}`)).map(([, raw]) => parseJson<{ rating: number } | null>(raw, null));
    const scores = all.filter((r): r is { rating: number } => r !== null).map((r) => r.rating);
    if (scores.length === 0) {
      await store.cmd('HDEL', 'ratings', giftId);
      return;
    }
    const average = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    await store.cmd('HSET', 'ratings', giftId, JSON.stringify({ average, count: scores.length } satisfies Rating));
  };

  const bumpSaves = async (giftId: string, by: 1 | -1) => {
    const score = Number(await store.cmd('ZINCRBY', 'saves', by, giftId));
    if (score <= 0) await store.cmd('ZREM', 'saves', giftId);
  };

  const favoritesOf = (userId: string) => store.cmd<string[]>('SMEMBERS', `favs:${userId}`);
  const remindersOf = async (userId: string) => parseJson<Reminder[]>(await store.cmd('GET', `reminders:${userId}`), []);
  const giftId = (value: unknown) => {
    const id = str(value, 60);
    return /^[a-z0-9][a-z0-9-]{1,59}$/.test(id) ? id : fail(400, 'bad_gift', 'המתנה לא נמצאה.');
  };

  switch (key) {
    case 'GET /bootstrap': {
      const [user, { catalog }, allRatings, popular] = await Promise.all([
        currentUser(),
        loadCatalog(),
        ratings(),
        store.cmd<string[]>('ZRANGE', 'saves', 0, 9, 'REV'),
      ]);
      const body: Bootstrap = {
        storage: true,
        me: user ? toMe(user) : null,
        catalog,
        favorites: user ? await favoritesOf(user.id) : [],
        reminders: user ? await remindersOf(user.id) : [],
        ratings: allRatings,
        popular,
      };
      return { status: 200, body };
    }

    case 'POST /auth/register': {
      await limit(`register:${req.ip}`, 8, 3600);
      const name = str(field(req.body, 'name'), 40);
      const email = str(field(req.body, 'email'), 120).toLowerCase();
      const password = typeof field(req.body, 'password') === 'string' ? (field(req.body, 'password') as string) : '';
      if (name.length < 2) fail(400, 'bad_name', 'איך לקרוא לך? צריך שם של שתי אותיות לפחות.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail(400, 'bad_email', 'כתובת האימייל לא נראית תקינה.');
      if (password.length < 8 || password.length > 200) fail(400, 'bad_password', 'הסיסמה צריכה להיות באורך 8 תווים לפחות.');
      if (isAdminEmail(email)) {
        // The admin address is public knowledge, so claiming it also needs the setup code.
        const code = str(field(req.body, 'adminCode'), 100);
        if (!config.adminSetupCode || !code || !sameText(code, config.adminSetupCode)) {
          fail(403, 'admin_code', 'זו כתובת של מנהל קטלוג. כדי לפתוח אותה צריך את קוד ההקמה.');
        }
      }
      const user: UserRecord = { id: randomUUID(), name, email, salt: randomBytes(16).toString('hex'), hash: '', createdAt: new Date().toISOString() };
      user.hash = (await derive(password, user.salt)).toString('hex');
      const claimed = await store.cmd('SET', `email:${email}`, user.id, 'NX');
      if (!claimed) fail(409, 'email_taken', 'כבר יש חשבון עם האימייל הזה. אפשר להתחבר.');
      await store.cmd('SET', `user:${user.id}`, JSON.stringify(user));
      return startSession(user);
    }

    case 'POST /auth/login': {
      const email = str(field(req.body, 'email'), 120).toLowerCase();
      const password = typeof field(req.body, 'password') === 'string' ? (field(req.body, 'password') as string) : '';
      await limit(`login:${req.ip}`, 20, 600);
      await limit(`login:${sha256(email)}`, 10, 600);
      const userId = await store.cmd<string | null>('GET', `email:${email}`);
      const user = userId ? parseJson<UserRecord | null>(await store.cmd('GET', `user:${userId}`), null) : null;
      // Derive even when the account is missing so both cases take about the same time.
      const derived = await derive(password, user?.salt ?? 'no-such-user');
      const matches = user !== null && timingSafeEqual(derived, Buffer.from(user.hash, 'hex'));
      if (!user || !matches) return fail(401, 'bad_login', 'האימייל או הסיסמה שגויים.');
      return startSession(user);
    }

    case 'POST /auth/logout': {
      const token = req.cookies[SESSION_COOKIE];
      const user = await currentUser();
      if (token) await store.cmd('DEL', `session:${sha256(token)}`);
      if (token && user) await store.cmd('SREM', `sessions:${user.id}`, sha256(token));
      return { status: 200, body: { ok: true }, cookies: [sessionCookie('', 0)] };
    }

    case 'POST /account/delete': {
      const user = await requireUser();
      const password = typeof field(req.body, 'password') === 'string' ? (field(req.body, 'password') as string) : '';
      const derived = await derive(password, user.salt);
      if (!timingSafeEqual(derived, Buffer.from(user.hash, 'hex'))) fail(401, 'bad_password', 'הסיסמה שגויה.');
      const [favorites, sessions, reviewed] = await Promise.all([
        favoritesOf(user.id),
        store.cmd<string[]>('SMEMBERS', `sessions:${user.id}`),
        store.cmd<string[]>('SMEMBERS', `userreviews:${user.id}`),
      ]);
      for (const id of favorites) await bumpSaves(id, -1);
      for (const id of reviewed) {
        await store.cmd('HDEL', `reviews:${id}`, user.id);
        await refreshRating(id);
      }
      await store.pipeline([
        ...sessions.map((hashed) => ['DEL', `session:${hashed}`]),
        ['DEL', `sessions:${user.id}`, `favs:${user.id}`, `reminders:${user.id}`, `userreviews:${user.id}`, `user:${user.id}`, `email:${user.email}`],
      ]);
      return { status: 200, body: { ok: true }, cookies: [sessionCookie('', 0)] };
    }

    case 'PUT /favorites': {
      // Merges favorites saved on this device before signing in.
      const user = await requireUser();
      const incoming = field(req.body, 'ids');
      const ids = Array.isArray(incoming) ? [...new Set(incoming.map((id) => str(id, 60)).filter((id) => /^[a-z0-9][a-z0-9-]{1,59}$/.test(id)))] : [];
      const current = await favoritesOf(user.id);
      const fresh = ids.filter((id) => !current.includes(id)).slice(0, Math.max(0, MAX_FAVORITES - current.length));
      for (const id of fresh) {
        await store.cmd('SADD', `favs:${user.id}`, id);
        await bumpSaves(id, 1);
      }
      return { status: 200, body: { favorites: [...current, ...fresh] } };
    }

    case 'POST /favorites/toggle': {
      const user = await requireUser();
      const id = giftId(field(req.body, 'id'));
      const saved = field(req.body, 'saved') === true;
      if (saved) {
        const current = await favoritesOf(user.id);
        if (current.length >= MAX_FAVORITES && !current.includes(id)) fail(400, 'too_many_favorites', 'הגעת למספר המועדפים המרבי.');
        if ((await store.cmd<number>('SADD', `favs:${user.id}`, id)) === 1) await bumpSaves(id, 1);
      } else if ((await store.cmd<number>('SREM', `favs:${user.id}`, id)) === 1) {
        await bumpSaves(id, -1);
      }
      return { status: 200, body: { favorites: await favoritesOf(user.id) } };
    }

    case 'GET /reviews': {
      const id = giftId(req.query.get('gift'));
      const user = await currentUser();
      const admin = user !== null && isAdminEmail(user.email);
      const reviews: Review[] = pairs(await store.cmd('HGETALL', `reviews:${id}`))
        .map(([userId, raw]) => {
          const saved = parseJson<Omit<Review, 'mine' | 'author'> | null>(raw, null);
          if (!saved) return null;
          const review: Review = { ...saved, mine: userId === user?.id };
          // Only a catalog manager gets the author key, to be able to remove a review.
          if (admin) review.author = userId;
          return review;
        })
        .filter((review): review is Review => review !== null)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { status: 200, body: { reviews } };
    }

    case 'POST /reviews': {
      const user = await requireUser();
      await limit(`review:${user.id}`, 20, 3600);
      const id = giftId(field(req.body, 'giftId'));
      const { catalog } = await loadCatalog();
      if (!catalog.some((gift) => gift.id === id)) fail(404, 'bad_gift', 'המתנה לא נמצאה.');
      const rating = Number(field(req.body, 'rating'));
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) fail(400, 'bad_rating', 'בחרו דירוג בין כוכב אחד לחמישה.');
      const text = str(field(req.body, 'text'), 500);
      const review = { name: user.name, rating, text, createdAt: new Date().toISOString() };
      await store.pipeline([
        ['HSET', `reviews:${id}`, user.id, JSON.stringify(review)],
        ['SADD', `userreviews:${user.id}`, id],
      ]);
      await refreshRating(id);
      return { status: 200, body: { ratings: await ratings() } };
    }

    case 'POST /reviews/delete': {
      const user = await requireUser();
      const id = giftId(field(req.body, 'giftId'));
      const author = str(field(req.body, 'author'), 60) || user.id;
      if (author !== user.id && !isAdminEmail(user.email)) fail(403, 'not_admin', 'אפשר למחוק רק ביקורת שכתבת.');
      await store.pipeline([
        ['HDEL', `reviews:${id}`, author],
        ['SREM', `userreviews:${author}`, id],
      ]);
      await refreshRating(id);
      return { status: 200, body: { ratings: await ratings() } };
    }

    case 'POST /reminders': {
      const user = await requireUser();
      const name = str(field(req.body, 'name'), 40);
      if (!name) fail(400, 'bad_name', 'למי התזכורת? חסר שם.');
      const occasion = field(req.body, 'occasion');
      if (typeof occasion !== 'string' || !(occasion in OCCASIONS)) fail(400, 'bad_occasion', 'צריך לבחור סוג אירוע.');
      const relationRaw = field(req.body, 'relation');
      const relation = typeof relationRaw === 'string' && relationRaw in RELATIONS ? (relationRaw as Relation) : null;
      const date = str(field(req.body, 'date'), 10);
      const parsed = new Date(`${date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
        fail(400, 'bad_date', 'התאריך לא תקין.');
      }
      const reminders = await remindersOf(user.id);
      if (reminders.length >= MAX_REMINDERS) fail(400, 'too_many_reminders', 'הגעת למספר התזכורות המרבי.');
      const reminder: Reminder = { id: randomUUID(), name, occasion: occasion as Occasion, relation, date, yearly: field(req.body, 'yearly') !== false };
      const next = [...reminders, reminder];
      await store.cmd('SET', `reminders:${user.id}`, JSON.stringify(next));
      return { status: 200, body: { reminders: next } };
    }

    case 'POST /reminders/delete': {
      const user = await requireUser();
      const id = str(field(req.body, 'id'), 60);
      const next = (await remindersOf(user.id)).filter((reminder) => reminder.id !== id);
      await store.cmd('SET', `reminders:${user.id}`, JSON.stringify(next));
      return { status: 200, body: { reminders: next } };
    }

    case 'PUT /admin/gift': {
      await requireAdmin();
      const parsed = parseGift(field(req.body, 'gift'));
      if ('error' in parsed) return fail(400, 'bad_gift', parsed.error);
      const { catalog } = await loadCatalog();
      const exists = catalog.some((gift) => gift.id === parsed.gift.id);
      if (!exists && field(req.body, 'isNew') !== true) fail(404, 'bad_gift', 'המוצר לא נמצא בקטלוג.');
      if (exists && field(req.body, 'isNew') === true) fail(409, 'id_taken', 'כבר יש מוצר עם המזהה הזה.');
      if (!exists && catalog.length >= MAX_CATALOG) fail(400, 'catalog_full', 'הקטלוג מלא.');
      const next = exists ? catalog.map((gift) => (gift.id === parsed.gift.id ? parsed.gift : gift)) : [parsed.gift, ...catalog];
      await store.cmd('SET', 'catalog', JSON.stringify(next));
      return { status: 200, body: { catalog: next } };
    }

    case 'POST /admin/gift/delete': {
      await requireAdmin();
      const id = giftId(field(req.body, 'id'));
      const { catalog } = await loadCatalog();
      const next = catalog.filter((gift) => gift.id !== id);
      await store.pipeline([
        ['SET', 'catalog', JSON.stringify(next)],
        ['ZREM', 'saves', id],
        ['HDEL', 'ratings', id],
        ['DEL', `reviews:${id}`],
      ]);
      return { status: 200, body: { catalog: next } };
    }

    case 'POST /admin/reset': {
      await requireAdmin();
      await store.cmd('DEL', 'catalog');
      return { status: 200, body: { catalog: config.seed } };
    }

    default:
      return fail(404, 'not_found', 'הכתובת לא קיימת.');
  }
}
