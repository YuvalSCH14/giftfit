import { beforeEach, describe, expect, it } from 'vitest';
import { handle, type ApiRequest, type ApiResponse, type Config } from '../server/app';
import { MemoryStore, PrefixedStore, storeFromEnv, type Store } from '../server/store';
import type { Bootstrap } from '../src/api-types';
import { DEMO_CATALOG } from './fixtures/demo-catalog';

const config: Config = { seed: DEMO_CATALOG, adminEmails: ['boss@example.com'], adminSetupCode: 'setup-123' };

/** A browser stand-in: keeps the session cookie between calls. */
function client(store: Store | null, ip = '1.1.1.1') {
  let cookie = '';
  const call = async (method: string, path: string, body?: unknown, extra: Partial<ApiRequest> = {}): Promise<ApiResponse> => {
    const [pathname, query = ''] = path.split('?');
    const response = await handle(
      {
        method,
        path: pathname,
        query: new URLSearchParams(query),
        body,
        cookies: cookie ? { gf_session: cookie } : {},
        ip,
        origin: 'https://giftfit.test',
        host: 'giftfit.test',
        contentType: method === 'GET' ? undefined : 'application/json',
        secure: true,
        ...extra,
      },
      store,
      config,
    );
    for (const header of response.cookies ?? []) cookie = header.split(';')[0].split('=')[1];
    return response;
  };
  return {
    call,
    get: (path: string) => call('GET', path),
    post: (path: string, body?: unknown) => call('POST', path, body ?? {}),
    put: (path: string, body?: unknown) => call('PUT', path, body ?? {}),
    boot: async () => (await call('GET', '/bootstrap')).body as Bootstrap,
  };
}

const dana = { name: 'דנה', email: 'dana@example.com', password: 'correct horse' };
const code = (response: ApiResponse) => (response.body as { error?: { code: string } }).error?.code;

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
});

describe('without a database', () => {
  it('serves the built-in catalog and refuses account actions clearly', async () => {
    const guest = client(null);
    const boot = await guest.boot();
    expect(boot.storage).toBe(false);
    expect(boot.catalog).toHaveLength(12);
    const response = await guest.post('/auth/register', dana);
    expect(response.status).toBe(503);
    expect(code(response)).toBe('storage_unavailable');
  });

  it('only falls back to memory outside Vercel', () => {
    expect(storeFromEnv({ VERCEL: '1' })).toBeNull();
    expect(storeFromEnv({})).not.toBeNull();
    expect(storeFromEnv({ VERCEL: '1', KV_REST_API_URL: 'https://x.example', KV_REST_API_TOKEN: 't' })).not.toBeNull();
  });
});

describe('shared database', () => {
  it('keeps every GiftFit key under its own prefix', async () => {
    const shared = new MemoryStore();
    await shared.cmd('SET', 'catalog', 'another app');
    await shared.cmd('SET', 'user:1', 'another app');
    const browser = client(new PrefixedStore(shared, 'giftfit:'));
    await browser.post('/auth/register', dana);
    await browser.post('/favorites/toggle', { id: 'care-kit', saved: true });
    await browser.post('/reviews', { giftId: 'care-kit', rating: 5 });
    expect((await browser.boot()).favorites).toEqual(['care-kit']);
    expect(await shared.cmd('EXISTS', 'giftfit:email:dana@example.com')).toBe(1);
    expect(await shared.cmd('EXISTS', 'email:dana@example.com')).toBe(0);
    expect(await shared.cmd('ZRANGE', 'giftfit:saves', 0, -1)).toEqual(['care-kit']);

    await browser.post('/account/delete', { password: dana.password });
    expect(await shared.cmd('EXISTS', 'giftfit:email:dana@example.com')).toBe(0);
    // The other app's keys with the same names are untouched.
    expect(await shared.cmd('GET', 'catalog')).toBe('another app');
    expect(await shared.cmd('GET', 'user:1')).toBe('another app');
  });
});

describe('accounts', () => {
  it('registers, keeps the session, logs out and logs back in', async () => {
    const browser = client(store);
    const registered = await browser.post('/auth/register', dana);
    expect(registered.status).toBe(200);
    expect(registered.cookies?.[0]).toMatch(/HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/);
    expect((await browser.boot()).me).toEqual({ name: 'דנה', email: 'dana@example.com', isAdmin: false });

    await browser.post('/auth/logout');
    expect((await browser.boot()).me).toBeNull();

    expect(code(await browser.post('/auth/login', { email: dana.email, password: 'wrong password' }))).toBe('bad_login');
    expect(code(await browser.post('/auth/login', { email: 'nobody@example.com', password: 'whatever12' }))).toBe('bad_login');
    expect((await browser.post('/auth/login', { email: 'DANA@example.com', password: dana.password })).status).toBe(200);
    expect((await browser.boot()).me?.name).toBe('דנה');
  });

  it('never stores the password itself', async () => {
    await client(store).post('/auth/register', dana);
    const everything = JSON.stringify(await Promise.all(['GET'].map(() => store.cmd('GET', 'email:dana@example.com').then((id) => store.cmd('GET', `user:${id}`)))));
    expect(everything).not.toContain(dana.password);
  });

  it('validates input and refuses a second account with the same email', async () => {
    const browser = client(store);
    expect(code(await browser.post('/auth/register', { ...dana, password: 'short' }))).toBe('bad_password');
    expect(code(await browser.post('/auth/register', { ...dana, email: 'not-an-email' }))).toBe('bad_email');
    expect(code(await browser.post('/auth/register', { ...dana, name: '' }))).toBe('bad_name');
    await browser.post('/auth/register', dana);
    expect(code(await client(store).post('/auth/register', dana))).toBe('email_taken');
  });

  it('limits repeated login attempts', async () => {
    const browser = client(store);
    await browser.post('/auth/register', dana);
    let last: ApiResponse | undefined;
    for (let i = 0; i < 11; i++) last = await browser.post('/auth/login', { email: dana.email, password: 'wrong password' });
    expect(last?.status).toBe(429);
  });

  it('rejects cross-site and non-JSON writes', async () => {
    const browser = client(store);
    expect((await browser.call('POST', '/auth/register', dana, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await browser.call('POST', '/auth/register', dana, { contentType: 'text/plain' })).status).toBe(415);
  });

  it('deletes the account with everything attached to it', async () => {
    const browser = client(store);
    await browser.post('/auth/register', dana);
    await browser.post('/favorites/toggle', { id: 'care-kit', saved: true });
    await browser.post('/reviews', { giftId: 'care-kit', rating: 5, text: 'מעולה' });
    expect(code(await browser.post('/account/delete', { password: 'wrong password' }))).toBe('bad_password');
    expect((await browser.post('/account/delete', { password: dana.password })).status).toBe(200);
    const boot = await browser.boot();
    expect(boot.me).toBeNull();
    expect(boot.ratings).toEqual({});
    expect(boot.popular).toEqual([]);
    expect(code(await browser.post('/auth/login', { email: dana.email, password: dana.password }))).toBe('bad_login');
  });
});

describe('favorites', () => {
  it('requires an account, syncs across devices and feeds the popular list', async () => {
    expect((await client(store).post('/favorites/toggle', { id: 'care-kit', saved: true })).status).toBe(401);

    const phone = client(store);
    await phone.post('/auth/register', dana);
    await phone.post('/favorites/toggle', { id: 'care-kit', saved: true });
    await phone.post('/favorites/toggle', { id: 'care-kit', saved: true });
    const merged = await phone.put('/favorites', { ids: ['plant', 'care-kit', 'NOT VALID'] });
    expect((merged.body as { favorites: string[] }).favorites.sort()).toEqual(['care-kit', 'plant']);

    const laptop = client(store);
    await laptop.post('/auth/login', dana);
    expect((await laptop.boot()).favorites.sort()).toEqual(['care-kit', 'plant']);

    const other = client(store, '2.2.2.2');
    await other.post('/auth/register', { name: 'יואב', email: 'yoav@example.com', password: 'another pass' });
    await other.post('/favorites/toggle', { id: 'plant', saved: true });
    expect((await other.boot()).popular).toEqual(['plant', 'care-kit']);

    await laptop.post('/favorites/toggle', { id: 'care-kit', saved: false });
    expect((await phone.boot()).favorites).toEqual(['plant']);
    expect((await phone.boot()).popular).toEqual(['plant']);
  });
});

describe('reviews', () => {
  it('keeps one review per person and an up-to-date average', async () => {
    const a = client(store);
    await a.post('/auth/register', dana);
    expect(code(await a.post('/reviews', { giftId: 'care-kit', rating: 9 }))).toBe('bad_rating');
    expect(code(await a.post('/reviews', { giftId: 'no-such-gift', rating: 4 }))).toBe('bad_gift');
    await a.post('/reviews', { giftId: 'care-kit', rating: 2, text: 'בסדר' });
    await a.post('/reviews', { giftId: 'care-kit', rating: 4, text: 'אחרי שימוש, ממש טוב' });

    const b = client(store, '2.2.2.2');
    await b.post('/auth/register', { name: 'יואב', email: 'yoav@example.com', password: 'another pass' });
    await b.post('/reviews', { giftId: 'care-kit', rating: 5, text: '' });

    expect((await b.boot()).ratings['care-kit']).toEqual({ average: 4.5, count: 2 });
    const { reviews } = (await a.get('/reviews?gift=care-kit')).body as { reviews: { name: string; mine: boolean; author?: string; text: string }[] };
    expect(reviews).toHaveLength(2);
    expect(reviews.find((r) => r.mine)?.text).toBe('אחרי שימוש, ממש טוב');
    expect(reviews.every((r) => r.author === undefined)).toBe(true);

    await a.post('/reviews/delete', { giftId: 'care-kit' });
    expect((await a.boot()).ratings['care-kit']).toEqual({ average: 5, count: 1 });
    expect((await client(store).post('/reviews', { giftId: 'care-kit', rating: 5 })).status).toBe(401);
  });
});

describe('reminders', () => {
  it('saves, validates and deletes reminders per account', async () => {
    const browser = client(store);
    await browser.post('/auth/register', dana);
    expect(code(await browser.post('/reminders', { name: 'אמא', occasion: 'birthday', date: '2027-02-30' }))).toBe('bad_date');
    expect(code(await browser.post('/reminders', { name: '', occasion: 'birthday', date: '2027-03-01' }))).toBe('bad_name');
    const saved = await browser.post('/reminders', { name: 'אמא', occasion: 'birthday', relation: 'parent', date: '2027-03-01' });
    const [reminder] = (saved.body as { reminders: { id: string; yearly: boolean; relation: string }[] }).reminders;
    expect(reminder).toMatchObject({ yearly: true, relation: 'parent' });
    expect((await browser.boot()).reminders).toHaveLength(1);
    await browser.post('/reminders/delete', { id: reminder.id });
    expect((await browser.boot()).reminders).toEqual([]);
  });
});

describe('catalog management', () => {
  const gift = { ...DEMO_CATALOG[0], id: 'new-gift', name: 'מתנה חדשה', stores: [{ name: 'חנות', url: 'https://shop.example/p/1', regions: [], delivery: true }] };

  it('needs the setup code to open the manager account', async () => {
    const browser = client(store);
    const boss = { name: 'מנהל', email: 'boss@example.com', password: 'manager pass' };
    expect(code(await browser.post('/auth/register', boss))).toBe('admin_code');
    expect(code(await browser.post('/auth/register', { ...boss, adminCode: 'guess' }))).toBe('admin_code');
    expect((await browser.post('/auth/register', { ...boss, adminCode: 'setup-123' })).status).toBe(200);
    expect((await browser.boot()).me?.isAdmin).toBe(true);
  });

  it('lets only a manager add, edit, delete and reset products', async () => {
    const user = client(store);
    await user.post('/auth/register', dana);
    expect((await user.put('/admin/gift', { gift, isNew: true })).status).toBe(403);
    expect((await client(store).put('/admin/gift', { gift, isNew: true })).status).toBe(401);

    const boss = client(store, '3.3.3.3');
    await boss.post('/auth/register', { name: 'מנהל', email: 'boss@example.com', password: 'manager pass', adminCode: 'setup-123' });
    expect(code(await boss.put('/admin/gift', { gift: { ...gift, price: 0 }, isNew: true }))).toBe('bad_gift');
    expect((await boss.put('/admin/gift', { gift, isNew: true })).status).toBe(200);
    expect(code(await boss.put('/admin/gift', { gift, isNew: true }))).toBe('id_taken');
    expect((await user.boot()).catalog[0]).toMatchObject({ id: 'new-gift', stores: [{ url: 'https://shop.example/p/1' }] });

    await boss.put('/admin/gift', { gift: { ...gift, price: 77 } });
    expect((await user.boot()).catalog.find((g) => g.id === 'new-gift')?.price).toBe(77);

    await user.post('/reviews', { giftId: 'new-gift', rating: 5 });
    await boss.post('/admin/gift/delete', { id: 'new-gift' });
    const afterDelete = await user.boot();
    expect(afterDelete.catalog).toHaveLength(12);
    expect(afterDelete.ratings).toEqual({});

    await boss.post('/admin/gift/delete', { id: 'care-kit' });
    expect((await user.boot()).catalog).toHaveLength(11);
    await boss.post('/admin/reset');
    expect((await user.boot()).catalog).toHaveLength(12);
  });

  it('lets a manager remove someone else\'s review', async () => {
    const user = client(store);
    await user.post('/auth/register', dana);
    await user.post('/reviews', { giftId: 'care-kit', rating: 1, text: 'ספאם' });
    const boss = client(store, '3.3.3.3');
    await boss.post('/auth/register', { name: 'מנהל', email: 'boss@example.com', password: 'manager pass', adminCode: 'setup-123' });
    const { reviews } = (await boss.get('/reviews?gift=care-kit')).body as { reviews: { author?: string }[] };
    expect(reviews[0].author).toBeTruthy();
    await boss.post('/reviews/delete', { giftId: 'care-kit', author: reviews[0].author });
    expect((await user.boot()).ratings).toEqual({});
  });
});
