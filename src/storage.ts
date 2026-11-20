import { useCallback, useEffect, useState } from 'react';
import { CATALOG, EMPTY_SEARCH, type Search } from './catalog';

const FAVORITES_KEY = 'giftfit:favorites';
const FORM_KEY = 'giftfit:search-form';

/** The questionnaire as typed: budget stays text so partial or invalid input is kept for fixing. */
export interface SearchForm extends Omit<Search, 'budgetMin' | 'budgetMax'> {
  budgetMin: string;
  budgetMax: string;
}

export const EMPTY_FORM: SearchForm = { ...EMPTY_SEARCH, budgetMin: '', budgetMax: '' };

const toNumber = (text: string): number | null => {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
};

export function toSearch(form: SearchForm): Search {
  return {
    ...form,
    budgetMin: toNumber(form.budgetMin),
    budgetMax: toNumber(form.budgetMax),
    region: form.fulfilment === 'pickup' ? form.region : null,
  };
}

function read<T>(storage: Storage | undefined, key: string, fallback: T): T {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(storage: Storage | undefined, key: string, value: unknown) {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); the app still works for the session.
  }
}

const local = () => (typeof window === 'undefined' ? undefined : window.localStorage);
const session = () => (typeof window === 'undefined' ? undefined : window.sessionStorage);

/** Favorite gift ids, shared by every screen and kept in localStorage. */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>(() => {
    const stored = read<unknown>(local(), FAVORITES_KEY, []);
    const known = new Set(CATALOG.map((gift) => gift.id));
    return Array.isArray(stored) ? stored.filter((id): id is string => known.has(id as string)) : [];
  });

  useEffect(() => write(local(), FAVORITES_KEY, ids), [ids]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_KEY) setIds(read<string[]>(local(), FAVORITES_KEY, []));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }, []);

  return { ids, toggle, has: (id: string) => ids.includes(id) };
}

interface StoredForm {
  form: SearchForm;
  submitted: boolean;
}

/** The questionnaire values, kept for the tab so editing a search and refreshing both restore them. */
export function useSearchForm() {
  const [state, setState] = useState<StoredForm>(() => {
    const stored = read<Partial<StoredForm>>(session(), FORM_KEY, {});
    return { form: { ...EMPTY_FORM, ...stored.form }, submitted: stored.submitted === true };
  });

  useEffect(() => write(session(), FORM_KEY, state), [state]);

  const setForm = useCallback((form: SearchForm) => setState((s) => ({ ...s, form })), []);
  const submit = useCallback((form: SearchForm) => setState({ form, submitted: true }), []);
  return { form: state.form, submitted: state.submitted, setForm, submit };
}

/** Minimal hash router: "#/gift/care-kit" becomes ["gift", "care-kit"]. */
export function useRoute(): string[] {
  const parse = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [route, setRoute] = useState<string[]>(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string) {
  window.location.hash = path;
}
