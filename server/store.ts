// Storage for the API: a small Redis command interface with two implementations.
// Production uses Upstash Redis over REST. Local development and tests use an in-memory stand-in.

export type Arg = string | number;

export interface Store {
  cmd<T = unknown>(...args: Arg[]): Promise<T>;
  pipeline(commands: Arg[][]): Promise<unknown[]>;
}

class UpstashStore implements Store {
  constructor(
    private url: string,
    private token: string,
  ) {}

  private async post(path: string, body: unknown): Promise<unknown> {
    const response = await fetch(this.url.replace(/\/$/, '') + path, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`storage request failed with ${response.status}`);
    return response.json();
  }

  async cmd<T>(...args: Arg[]): Promise<T> {
    const reply = (await this.post('', args)) as { result?: T; error?: string };
    if (reply.error) throw new Error(reply.error);
    return reply.result as T;
  }

  async pipeline(commands: Arg[][]): Promise<unknown[]> {
    if (commands.length === 0) return [];
    const replies = (await this.post('/pipeline', commands)) as { result?: unknown; error?: string }[];
    return replies.map((reply) => {
      if (reply.error) throw new Error(reply.error);
      return reply.result;
    });
  }
}

type Value = string | Set<string> | Map<string, string> | Map<string, number>;

/** Implements only the Redis commands the API uses, with the same reply shapes as Upstash. */
export class MemoryStore implements Store {
  private data = new Map<string, { value: Value; expires?: number; zset?: boolean }>();

  private entry(key: string) {
    const found = this.data.get(key);
    if (found?.expires && found.expires <= Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return found;
  }

  private make<T extends Value>(key: string, create: () => T, zset = false): T {
    const found = this.entry(key);
    if (found) return found.value as T;
    const value = create();
    this.data.set(key, { value, zset });
    return value;
  }

  async cmd<T>(...args: Arg[]): Promise<T> {
    const [name, key, ...rest] = args.map(String);
    const reply = (value: unknown) => value as T;
    switch (name.toUpperCase()) {
      case 'GET': {
        const found = this.entry(key);
        return reply(typeof found?.value === 'string' ? found.value : null);
      }
      case 'SET': {
        const exIndex = rest.findIndex((arg) => arg.toUpperCase() === 'EX');
        if (rest.some((arg) => arg.toUpperCase() === 'NX') && this.entry(key)) return reply(null);
        const expires = exIndex >= 0 ? Date.now() + Number(rest[exIndex + 1]) * 1000 : undefined;
        this.data.set(key, { value: rest[0], expires });
        return reply('OK');
      }
      case 'DEL': {
        let removed = 0;
        for (const k of [key, ...rest]) if (this.entry(k) && this.data.delete(k)) removed++;
        return reply(removed);
      }
      case 'EXISTS':
        return reply(this.entry(key) ? 1 : 0);
      case 'INCR': {
        const found = this.entry(key);
        const next = Number(typeof found?.value === 'string' ? found.value : 0) + 1;
        this.data.set(key, { value: String(next), expires: found?.expires });
        return reply(next);
      }
      case 'EXPIRE': {
        const found = this.entry(key);
        if (!found) return reply(0);
        found.expires = Date.now() + Number(rest[0]) * 1000;
        return reply(1);
      }
      case 'SADD': {
        const set = this.make(key, () => new Set<string>());
        let added = 0;
        for (const member of rest) if (!set.has(member) && set.add(member)) added++;
        return reply(added);
      }
      case 'SREM': {
        const set = this.entry(key)?.value as Set<string> | undefined;
        let removed = 0;
        for (const member of rest) if (set?.delete(member)) removed++;
        return reply(removed);
      }
      case 'SMEMBERS':
        return reply([...((this.entry(key)?.value as Set<string> | undefined) ?? [])]);
      case 'HSET': {
        const hash = this.make(key, () => new Map<string, string>());
        for (let i = 0; i < rest.length; i += 2) hash.set(rest[i], rest[i + 1]);
        return reply(rest.length / 2);
      }
      case 'HGET':
        return reply((this.entry(key)?.value as Map<string, string> | undefined)?.get(rest[0]) ?? null);
      case 'HDEL':
        return reply((this.entry(key)?.value as Map<string, string> | undefined)?.delete(rest[0]) ? 1 : 0);
      case 'HGETALL': {
        const hash = this.entry(key)?.value as Map<string, string> | undefined;
        return reply(hash ? [...hash.entries()].flat() : []);
      }
      case 'ZINCRBY': {
        const zset = this.make(key, () => new Map<string, number>(), true);
        const next = (zset.get(rest[1]) ?? 0) + Number(rest[0]);
        zset.set(rest[1], next);
        return reply(String(next));
      }
      case 'ZRANGE': {
        const zset = (this.entry(key)?.value as Map<string, number> | undefined) ?? new Map<string, number>();
        const sorted = [...zset.entries()].sort((a, b) => a[1] - b[1]);
        if (rest.some((arg) => arg.toUpperCase() === 'REV')) sorted.reverse();
        const stop = Number(rest[1]);
        return reply(sorted.slice(Number(rest[0]), stop < 0 ? undefined : stop + 1).map(([member]) => member));
      }
      case 'ZREM':
        return reply((this.entry(key)?.value as Map<string, number> | undefined)?.delete(rest[0]) ? 1 : 0);
      default:
        throw new Error(`MemoryStore: unsupported command ${name}`);
    }
  }

  async pipeline(commands: Arg[][]): Promise<unknown[]> {
    const replies: unknown[] = [];
    for (const command of commands) replies.push(await this.cmd(...command));
    return replies;
  }
}

const globals = globalThis as { __giftfitMemoryStore?: MemoryStore };

/**
 * Picks the store from the environment. Returns null when running on Vercel without a
 * database connected, so the API can say so instead of silently losing data.
 */
export function storeFromEnv(env: Record<string, string | undefined> = process.env): Store | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return new UpstashStore(url, token);
  if (env.VERCEL) return null;
  return (globals.__giftfitMemoryStore ??= new MemoryStore());
}
