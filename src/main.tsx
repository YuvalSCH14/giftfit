import { StrictMode, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/heebo/hebrew-400.css';
import '@fontsource/heebo/hebrew-500.css';
import '@fontsource/heebo/hebrew-700.css';
import './style.css';
import { Profile, Reminders } from './account';
import { Admin } from './admin';
import { closestMatches, recommend, type Relaxed } from './catalog';
import { BottomNav, Header, type NavTarget } from './components';
import { Questionnaire } from './questionnaire';
import { SOON_DAYS, upcoming } from './reminders';
import { Details, FavoritesScreen, Find, Home, NotFound, Results, Stores } from './screens';
import { AppProvider, useApp } from './state';
import { navigate, toSearch, useRoute } from './storage';

/** Which bottom-bar tab each screen belongs to. */
const NAV_TABS: Record<string, NavTarget | undefined> = {
  home: 'home',
  search: 'search',
  results: 'search',
  find: 'search',
  favorites: 'favorites',
  profile: 'profile',
  reminders: 'profile',
  admin: 'profile',
};

function App() {
  const route = useRoute();
  const app = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedFor, setExpandedFor] = useState<string | null>(null);

  const { form, submitted } = app.search;
  const search = useMemo(() => (submitted ? toSearch(form) : null), [form, submitted]);
  const searchKey = useMemo(() => JSON.stringify(search), [search]);
  // Exact matches, or the closest gifts when nothing fits every choice.
  const { results, relaxed } = useMemo<{ results: ReturnType<typeof recommend>; relaxed: Relaxed[] }>(() => {
    if (!search) return { results: [], relaxed: [] };
    const exact = recommend(search, app.catalog);
    return exact.length ? { results: exact, relaxed: [] } : closestMatches(search, app.catalog);
  }, [search, app.catalog]);

  const [page, id] = route;
  const gift = app.getGift(id);
  const soon = useMemo(() => upcoming(app.reminders, new Date()).filter((reminder) => reminder.days <= SOON_DAYS).length, [app.reminders]);

  // The results screen needs a submitted search; without one, start from the questionnaire.
  useEffect(() => {
    if (page === 'results' && !search) navigate('search');
  }, [page, search]);

  let screen: ReactNode;
  if (!page) screen = <Home query={query} onQuery={setQuery} />;
  else if (page === 'search') screen = <Questionnaire />;
  else if (page === 'results') {
    screen = search && (
      <Results search={search} results={results} relaxed={relaxed} expanded={expandedFor === searchKey} onExpand={() => setExpandedFor(searchKey)} />
    );
  } else if (page === 'gift' && gift) {
    const match = relaxed.length ? undefined : results.find((r) => r.gift.id === gift.id);
    screen = <Details gift={gift} search={match ? search : null} reasons={match?.reasons ?? []} />;
  } else if (page === 'stores' && gift) {
    const inResults = relaxed.length === 0 && results.some((r) => r.gift.id === gift.id);
    screen = <Stores gift={gift} search={inResults ? search : null} />;
  } else if (page === 'favorites') screen = <FavoritesScreen />;
  else if (page === 'find') screen = <Find query={query} onQuery={setQuery} />;
  else if (page === 'profile') screen = <Profile />;
  else if (page === 'reminders') screen = <Reminders />;
  else if (page === 'admin') screen = <Admin id={id} />;
  else if ((page === 'gift' || page === 'stores') && !app.ready) screen = null; // the catalog may still be loading
  else screen = <NotFound />;

  // The bottom bar stays on every screen and steps aside only while a process is under way.
  const navVisible = !app.flowActive;
  // A gift or store page keeps the tab the user came from lit.
  const lastTab = useRef<NavTarget>('home');
  const activeTab = NAV_TABS[page ?? 'home'] ?? lastTab.current;
  lastTab.current = activeTab;

  return (
    <div className={`app${navVisible ? ' nav-visible' : ''}`}>
      <Header
        menuOpen={menuOpen}
        onMenu={setMenuOpen}
        favoriteCount={app.favorites.ids.length}
        signedIn={app.me !== null}
        isAdmin={app.me?.isAdmin === true}
        soon={soon}
      />
      {/* Keyed by route so each screen fades in and starts with fresh local state. */}
      <div className="screen-wrap" key={route.join('-')}>
        {screen}
      </div>
      <BottomNav active={activeTab} hidden={!navVisible} favoriteCount={app.favorites.ids.length} signedIn={app.me !== null} />
    </div>
  );
}

// Hosts that wrap the page in their own document may not carry these from index.html.
document.documentElement.lang = 'he';
document.documentElement.dir = 'rtl';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
