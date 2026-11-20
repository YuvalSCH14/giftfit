// App-wide state: the catalog, the signed-in account and everything synced with the API.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Bootstrap, Me, Rating, Reminder } from './api-types';
import type { Gift } from './catalog';
import { SEED_CATALOG } from './seed';
import { useFavorites, useSearchForm } from './storage';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const OFFLINE = 'אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.';

export async function api<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.BASE_URL}api${path}`, {
      method,
      credentials: 'same-origin',
      headers: method === 'GET' ? undefined : { 'content-type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError(0, 'offline', OFFLINE);
  }
  const data = (await response.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
  if (!response.ok || data === null) {
    throw new ApiError(response.status, data?.error?.code ?? 'offline', data?.error?.message ?? OFFLINE);
  }
  return data as T;
}

export const errorText = (error: unknown) => (error instanceof ApiError ? error.message : OFFLINE);

interface Favorites {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
}

export interface AppState {
  /** False until the first answer from the API (or its failure) arrives. */
  ready: boolean;
  /** Whether accounts, reviews and reminders are available. */
  storage: boolean;
  me: Me | null;
  catalog: Gift[];
  getGift: (id: string | undefined) => Gift | undefined;
  ratings: Record<string, Rating>;
  popular: string[];
  reminders: Reminder[];
  favorites: Favorites;
  search: ReturnType<typeof useSearchForm>;
  toast: (text: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; adminCode?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  setCatalog: (catalog: Gift[]) => void;
  setRatings: (ratings: Record<string, Rating>) => void;
  setReminders: (reminders: Reminder[]) => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const state = useContext(AppContext);
  if (!state) throw new Error('useApp must be used inside AppProvider');
  return state;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const local = useFavorites();
  const search = useSearchForm();
  const [boot, setBoot] = useState<Omit<Bootstrap, 'favorites'> & { ready: boolean }>({
    ready: false,
    storage: false,
    me: null,
    catalog: SEED_CATALOG,
    reminders: [],
    ratings: {},
    popular: [],
  });
  const [toastState, setToast] = useState<{ text: string; key: number } | null>(null);
  const toast = useCallback((text: string) => setToast({ text, key: Date.now() }), []);

  useEffect(() => {
    if (!toastState) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toastState]);

  const localIds = useRef(local.ids);
  localIds.current = local.ids;
  const { replace: replaceFavorites } = local;

  /** Loads everything from the API. Favorites saved on this device are merged into the account. */
  const load = useCallback(async () => {
    try {
      const data = await api<Bootstrap>('GET', '/bootstrap');
      setBoot({ ...data, ready: true });
      if (data.me) {
        const missing = localIds.current.filter((id) => !data.favorites.includes(id));
        const merged = missing.length ? (await api<{ favorites: string[] }>('PUT', '/favorites', { ids: missing })).favorites : data.favorites;
        replaceFavorites(merged);
      }
    } catch {
      // Offline or no API (for example a static preview): keep working with the built-in catalog.
      setBoot((current) => ({ ...current, ready: true }));
    }
  }, [replaceFavorites]);

  useEffect(() => {
    void load();
  }, [load]);

  const me = boot.me;
  const toggleFavorite = useCallback(
    (id: string) => {
      const saved = !localIds.current.includes(id);
      local.toggle(id);
      toast(saved ? 'נשמר במועדפים' : 'הוסר מהמועדפים');
      if (!me) return;
      api('POST', '/favorites/toggle', { id, saved }).catch((error) => {
        local.toggle(id);
        toast(errorText(error));
      });
    },
    [local, me, toast],
  );

  const state = useMemo<AppState>(() => {
    const byId = new Map(boot.catalog.map((gift) => [gift.id, gift]));
    return {
      ready: boot.ready,
      storage: boot.storage,
      me: boot.me,
      catalog: boot.catalog,
      getGift: (id) => (id ? byId.get(id) : undefined),
      ratings: boot.ratings,
      popular: boot.popular,
      reminders: boot.reminders,
      favorites: { ids: local.ids, has: local.has, toggle: toggleFavorite },
      search,
      toast,
      signIn: async (email, password) => {
        await api('POST', '/auth/login', { email, password });
        await load();
      },
      register: async (input) => {
        await api('POST', '/auth/register', input);
        await load();
      },
      signOut: async () => {
        await api('POST', '/auth/logout');
        // Favorites belong to the account, so they leave this device with it.
        replaceFavorites([]);
        setBoot((current) => ({ ...current, me: null, reminders: [] }));
      },
      deleteAccount: async (password) => {
        await api('POST', '/account/delete', { password });
        replaceFavorites([]);
        await load();
      },
      setCatalog: (catalog) => setBoot((current) => ({ ...current, catalog })),
      setRatings: (ratings) => setBoot((current) => ({ ...current, ratings })),
      setReminders: (reminders) => setBoot((current) => ({ ...current, reminders })),
    };
  }, [boot, local.ids, local.has, toggleFavorite, search, toast, load, replaceFavorites]);

  return (
    <AppContext.Provider value={state}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toastState && (
          <p className="toast" key={toastState.key}>
            {toastState.text}
          </p>
        )}
      </div>
    </AppContext.Provider>
  );
}
