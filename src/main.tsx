import { StrictMode, useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/heebo/hebrew-400.css';
import '@fontsource/heebo/hebrew-500.css';
import '@fontsource/heebo/hebrew-700.css';
import './style.css';
import {
  AGE_GROUPS,
  INTERESTS,
  OCCASIONS,
  REGIONS,
  RELATIONS,
  complementary,
  getGift,
  recommend,
  searchTitle,
  storesFor,
  validateSearch,
  type Gift,
  type Interest,
  type Occasion,
  type Recommendation,
  type Search,
} from './catalog';
import {
  BackButton,
  BottomNav,
  GiftCard,
  GiftMedia,
  Header,
  HeartButton,
  Price,
  PrimaryButton,
  asset,
  illustration,
} from './components';
import { EMPTY_FORM, href, navigate, toSearch, useFavorites, useRoute, useSearchForm, type SearchForm } from './storage';

interface Favorites {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
}

const HOME_OCCASIONS: Occasion[] = ['birthday', 'anniversary', 'barMitzvah', 'brit'];
const BEST_SELLERS = ['care-kit', 'board-game', 'baby-set', 'thermal-bottle', 'wine-set'];
const GALLERY = ['candle-set', 'headphones', 'plant', 'backpack'];
const INITIAL_RESULTS = 2;

// Illustrative reviews from the Figma mock-up. Shown only with a "sample" label.
const SAMPLE_REVIEWS = [
  { author: 'יובל', stars: 4, text: 'מוצר מעולה! מומלץ ביותר!!!' },
  { author: 'גל', stars: 5, text: 'מוצר איכותי ומחיר טוב' },
];

const entries = <K extends string>(labels: Record<K, string>) => Object.entries(labels) as [K, string][];
const gifts = (ids: string[]) => ids.map(getGift).filter((gift): gift is Gift => Boolean(gift));

function Home({ favorites, onOccasion }: { favorites: Favorites; onOccasion: (occasion: Occasion) => void }) {
  return (
    <main className="screen screen-home with-nav">
      <h1 className="home-title">מחפשים מתנה ?</h1>
      <PrimaryButton onClick={() => navigate('search')}>תעזרו לי למצא מתנה</PrimaryButton>

      <section aria-labelledby="occasions-title">
        <h2 id="occasions-title">מתנות לפי אירועים</h2>
        {/* Reference order, left to right: birthday, anniversary, bar/bat mitzvah, brit. */}
        <ul className="occasions" dir="ltr">
          {HOME_OCCASIONS.map((occasion) => (
            <li key={occasion}>
              <button type="button" onClick={() => onOccasion(occasion)}>
                <span className="occasion-circle" aria-hidden="true">
                  <img src={illustration(`catalog/occasion-${occasion}.svg`)} alt="" width={46} height={46} />
                </span>
                <span dir="rtl">{OCCASIONS[occasion].replace('/', '/​')}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="best-title">
        <h2 id="best-title">המתנות הנמכרות ביותר</h2>
        <ul className="tile-row">
          {gifts(BEST_SELLERS).map((gift) => (
            <li key={gift.id}>
              <GiftCard
                variant="tile"
                gift={gift}
                saved={favorites.has(gift.id)}
                onToggle={favorites.toggle}
                showPrice={false}
                footer={
                  <p className="tile-caption">
                    <span>{OCCASIONS[gift.occasions[0]]}</span>
                    <Price value={gift.price} />
                  </p>
                }
              />
            </li>
          ))}
        </ul>
      </section>
      <BottomNav active="home" />
    </main>
  );
}

/** The media block from the questionnaire frame, as a swipeable row of gift ideas with the four dots. */
function Gallery() {
  const slides = gifts(GALLERY);
  const track = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const [current, setCurrent] = useState(0);

  const onScroll = () => {
    const el = track.current;
    if (el) setCurrent(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const el = track.current;
      if (!el || touched.current || document.hidden) return;
      const next = (Math.round(Math.abs(el.scrollLeft) / el.clientWidth) + 1) % slides.length;
      // In an RTL scroller, positions run from 0 down to negative values.
      el.scrollTo({ left: -next * el.clientWidth, behavior: 'smooth' });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const stop = () => {
    touched.current = true;
  };

  return (
    <section className="gallery" aria-label="רעיונות למתנות">
      <div className="gallery-track" ref={track} onScroll={onScroll} onPointerDown={stop} onFocus={stop} onWheel={stop}>
        {slides.map((gift) => (
          <a key={gift.id} className="gallery-slide" href={href('gift', gift.id)}>
            <img src={illustration(gift.image ?? '')} alt="" width={96} height={96} />
            <span className="gallery-caption">
              {gift.name} · <Price value={gift.price} />
            </span>
          </a>
        ))}
      </div>
      <div className="gallery-dots" aria-hidden="true">
        {slides.map((gift, index) => (
          <span key={gift.id} className={index === current ? 'current' : undefined} />
        ))}
      </div>
    </section>
  );
}

function Row(props: { label: string; value: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  const id = useId();
  return (
    <div className={`row${props.open ? ' row-open' : ''}`}>
      <button type="button" className="row-head" aria-expanded={props.open} aria-controls={id} onClick={props.onToggle}>
        <span className="row-label">{props.label}</span>
        {props.value && <span className="row-value">{props.value}</span>}
        <img className="row-chevron" src={asset('chevron.svg')} alt="" width={14} height={7} />
      </button>
      <div id={id} className="row-panel" hidden={!props.open}>
        {props.children}
      </div>
    </div>
  );
}

function Choices<K extends string>(props: {
  legend: string;
  options: Record<K, string>;
  selected: K[];
  multiple?: boolean;
  onPick: (key: K) => void;
}) {
  const name = useId();
  return (
    <fieldset className="choices">
      <legend className="visually-hidden">{props.legend}</legend>
      {entries(props.options).map(([key, label]) => (
        <label key={key} className="chip">
          <input
            type={props.multiple ? 'checkbox' : 'radio'}
            name={name}
            checked={props.selected.includes(key)}
            onChange={() => props.onPick(key)}
            // A selected radio can be tapped again to clear the choice.
            onClick={() => !props.multiple && props.selected.includes(key) && props.onPick(key)}
          />
          <span>{label}</span>
        </label>
      ))}
    </fieldset>
  );
}

function budgetSummary(form: SearchForm): ReactNode {
  const min = form.budgetMin.trim();
  const max = form.budgetMax.trim();
  if (!min && !max) return '';
  // The range itself reads left to right; the shekel sign follows it in the Hebrew flow.
  if (min && max) {
    return (
      <>
        <bdi dir="ltr">{`${min}–${max}`}</bdi> ₪
      </>
    );
  }
  return (
    <>
      {min ? 'מ־' : 'עד '}
      <bdi dir="ltr">{min || max}</bdi> ₪
    </>
  );
}

const ROWS = ['occasion', 'relation', 'age', 'interests', 'budget', 'location'] as const;
type RowKey = (typeof ROWS)[number];
type SingleField = 'occasion' | 'relation' | 'age';

function Questionnaire(props: {
  form: SearchForm;
  onChange: (form: SearchForm) => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  const { form, onChange } = props;
  const [open, setOpen] = useState<RowKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<SearchForm>) => {
    setError(null);
    onChange({ ...form, ...patch });
  };
  const toggleRow = (key: RowKey) => setOpen((current) => (current === key ? null : key));

  /** Single-choice rows move on to the next question once answered. */
  const pickSingle = <K extends SingleField>(field: K, key: SearchForm[K]) => {
    const cleared = form[field] === key;
    set({ [field]: cleared ? null : key } as Partial<SearchForm>);
    if (!cleared) setOpen(ROWS[ROWS.indexOf(field) + 1]);
  };
  const toggleInterest = (interest: Interest) =>
    set({
      unsureInterests: false,
      interests: form.interests.includes(interest)
        ? form.interests.filter((i) => i !== interest)
        : [...form.interests, interest],
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateSearch(toSearch(form));
    if (problem) {
      setError(problem);
      setOpen('budget');
      return;
    }
    props.onSubmit();
  };

  const interestsValue = form.unsureInterests ? 'לא בטוחה' : form.interests.map((i) => INTERESTS[i]).join(', ');
  const locationValue =
    form.fulfilment === 'delivery'
      ? 'משלוח'
      : form.fulfilment === 'pickup'
        ? `איסוף${form.region ? `, ${REGIONS[form.region]}` : ''}`
        : '';
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const budgetField = (label: string, field: 'budgetMin' | 'budgetMax') => (
    <label>
      <span>{label}</span>
      <input
        id={field}
        dir="ltr"
        type="number"
        inputMode="numeric"
        min={0}
        step={10}
        placeholder="0"
        value={form[field]}
        onChange={(e) => set({ [field]: e.target.value })}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'budget-error' : undefined}
      />
    </label>
  );

  return (
    <main className="screen screen-search">
      <Gallery />
      <form className="questionnaire" onSubmit={submit} noValidate>
        <h1>למי המתנה?</h1>
        <div className="rows">
          <Row label="סוג האירוע" value={form.occasion ? OCCASIONS[form.occasion] : ''} open={open === 'occasion'} onToggle={() => toggleRow('occasion')}>
            <Choices legend="סוג האירוע" options={OCCASIONS} selected={form.occasion ? [form.occasion] : []} onPick={(k) => pickSingle('occasion', k)} />
          </Row>
          <Row label="קרבה למקבל המתנה" value={form.relation ? RELATIONS[form.relation] : ''} open={open === 'relation'} onToggle={() => toggleRow('relation')}>
            <Choices legend="קרבה למקבל המתנה" options={RELATIONS} selected={form.relation ? [form.relation] : []} onPick={(k) => pickSingle('relation', k)} />
          </Row>
          <Row label="גיל מקבל המתנה" value={form.age ? AGE_GROUPS[form.age] : ''} open={open === 'age'} onToggle={() => toggleRow('age')}>
            <Choices legend="גיל מקבל המתנה" options={AGE_GROUPS} selected={form.age ? [form.age] : []} onPick={(k) => pickSingle('age', k)} />
          </Row>
          <Row label="תחומי עניין" value={interestsValue} open={open === 'interests'} onToggle={() => toggleRow('interests')}>
            <p className="hint hint-first">אפשר לבחור כמה</p>
            <Choices legend="תחומי עניין, אפשר לבחור כמה" options={INTERESTS} selected={form.interests} multiple onPick={toggleInterest} />
            <label className="chip chip-unsure">
              <input
                type="checkbox"
                checked={form.unsureInterests}
                onChange={(e) => set({ unsureInterests: e.target.checked, interests: e.target.checked ? [] : form.interests })}
              />
              <span>לא בטוחה</span>
            </label>
          </Row>
          <Row label="תקציב" value={budgetSummary(form)} open={open === 'budget'} onToggle={() => toggleRow('budget')}>
            <div className="budget">
              {budgetField('מינימום (₪)', 'budgetMin')}
              {budgetField('מקסימום (₪)', 'budgetMax')}
            </div>
            {error && (
              <p id="budget-error" className="error" role="alert">
                {error}
              </p>
            )}
          </Row>
          <Row label="מיקום" value={locationValue} open={open === 'location'} onToggle={() => toggleRow('location')}>
            <Choices
              legend="אופן קבלה"
              options={{ pickup: 'איסוף עצמי', delivery: 'משלוח' }}
              selected={form.fulfilment ? [form.fulfilment] : []}
              onPick={(k) => set({ fulfilment: form.fulfilment === k ? null : k })}
            />
            {form.fulfilment === 'pickup' && (
              <>
                <p className="hint">באיזה אזור נוח לאסוף?</p>
                <Choices legend="אזור איסוף" options={REGIONS} selected={form.region ? [form.region] : []} onPick={(k) => set({ region: form.region === k ? null : k })} />
              </>
            )}
          </Row>
        </div>
        <div className="sticky-cta">
          <PrimaryButton type="submit">מצא לי מתנות מתאימות</PrimaryButton>
        </div>
        {dirty && (
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setError(null);
              setOpen(null);
              props.onReset();
            }}
          >
            ניקוי הבחירות
          </button>
        )}
      </form>
    </main>
  );
}

function Results(props: {
  search: Search;
  results: Recommendation[];
  favorites: Favorites;
  expanded: boolean;
  onExpand: () => void;
}) {
  const { results, favorites } = props;
  if (results.length === 0) {
    return (
      <main className="screen screen-results">
        <h1>לא מצאנו מתנות מתאימות</h1>
        <p className="empty">אין בקטלוג פריט שמתאים לכל הבחירות. נסו להרחיב את התקציב, לשנות אזור או לבחור פחות תחומי עניין.</p>
        <PrimaryButton onClick={() => navigate('search')}>עריכת החיפוש</PrimaryButton>
      </main>
    );
  }

  const visible = props.expanded ? results : results.slice(0, INITIAL_RESULTS);
  return (
    <main className="screen screen-results">
      <h1>{searchTitle(props.search)}</h1>
      <a className="text-link" href={href('search')}>
        עריכת החיפוש
      </a>
      <ul className="result-list">
        {visible.map(({ gift }) => (
          <li key={gift.id}>
            <GiftCard variant="large" gift={gift} saved={favorites.has(gift.id)} onToggle={favorites.toggle} />
          </li>
        ))}
      </ul>
      {visible.length < results.length ? (
        <div className="sticky-cta">
          <PrimaryButton onClick={props.onExpand}>להמלצות נוספות</PrimaryButton>
        </div>
      ) : (
        <p className="end-note" role="status">
          {results.length === 1 ? 'זו ההמלצה היחידה לחיפוש הזה.' : `אלה כל ${results.length} ההמלצות לחיפוש הזה.`}
        </p>
      )}
    </main>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="stars" dir="ltr" role="img" aria-label={`${count} מתוך 5 כוכבים`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <img key={n} src={asset(n <= 5 - count ? 'star-empty.svg' : 'star-filled.svg')} alt="" width={24} height={24} />
      ))}
    </span>
  );
}

function Details(props: { gift: Gift; search: Search | null; reasons: string[]; favorites: Favorites }) {
  const { gift, favorites } = props;
  return (
    <main className="screen screen-details with-nav">
      <BackButton />
      <h1>{props.search ? searchTitle(props.search) : 'פרטי המתנה'}</h1>
      <article className="gift-card gift-card-detail">
        <GiftMedia gift={gift} />
        <div className="info-strip">
          <span className="gift-name">{gift.name}</span>
          <Price value={gift.price} />
        </div>
        <HeartButton gift={gift} saved={favorites.has(gift.id)} onToggle={favorites.toggle} size="large" />
      </article>

      {/* Figma order: the purchase action sits directly under the card, clear of the bottom bar. */}
      <PrimaryButton onClick={() => navigate('stores', gift.id)}>איפה ניתן לרכוש?</PrimaryButton>

      <section className="why" aria-labelledby="why-title">
        <h2 id="why-title">למה זה מתאים?</h2>
        <p>{gift.description}</p>
        {props.reasons.length > 0 && (
          <ul>
            {props.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="reviews" aria-labelledby="reviews-title">
        <h2 id="reviews-title">ביקורות על המוצר</h2>
        <p className="sample-tag">ביקורות לדוגמה, לא של לקוחות אמיתיים</p>
        {SAMPLE_REVIEWS.map((review) => (
          <div key={review.author} className="review">
            <p className="review-head">
              <span>{review.author}</span>
              <Stars count={review.stars} />
            </p>
            <p>{review.text}</p>
          </div>
        ))}
      </section>
      <BottomNav />
    </main>
  );
}

function Stores({ gift, search, favorites }: { gift: Gift; search: Search | null; favorites: Favorites }) {
  const stores = storesFor(gift, search);
  const others = complementary(gift);
  const count = stores.length === 1 ? 'נמצאה חנות אחת' : `נמצאו ${stores.length} חנויות`;
  return (
    <main className="screen screen-stores with-nav">
      <BackButton />
      <h1>{stores.length === 0 ? 'לא נמצאו חנויות' : count}</h1>
      <p className="context">
        עבור <a href={href('gift', gift.id)}>{gift.name}</a>, <Price value={gift.price} />
      </p>
      <ul className="store-list">
        {stores.map((store) => (
          <li key={store.name} className="store">
            <span className="media">
              <img src={asset('image-placeholder-wide.svg')} alt="" width={135} height={105} />
            </span>
            <h2>{store.name}</h2>
            <p>{store.region ? `איסוף עצמי ב${REGIONS[store.region]}` : 'משלוח עד הבית'}</p>
            {store.url ? (
              <a className="text-link" href={store.url} target="_blank" rel="noopener noreferrer">
                מעבר לעמוד המוצר בחנות
              </a>
            ) : (
              <p className="sample-tag">מוצר לדוגמה, אין עדיין קישור לרכישה</p>
            )}
          </li>
        ))}
      </ul>

      {others.length > 0 && (
        <section aria-labelledby="more-title">
          <h2 id="more-title" className="section-title">
            מוצרים משלימים
          </h2>
          <ul className="grid">
            {others.map((other) => (
              <li key={other.id}>
                <GiftCard variant="compact" gift={other} saved={favorites.has(other.id)} onToggle={favorites.toggle} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <BottomNav />
    </main>
  );
}

function FavoritesScreen({ favorites }: { favorites: Favorites }) {
  const saved = gifts(favorites.ids);
  return (
    <main className="screen screen-favorites with-nav">
      <h1>המתנות שאהבתי</h1>
      {saved.length === 0 ? (
        <>
          <p className="empty">כאן יופיעו המתנות שסימנת בלב</p>
          <PrimaryButton onClick={() => navigate('search')}>למצוא מתנה</PrimaryButton>
        </>
      ) : (
        <ul className="grid">
          {saved.map((gift) => (
            <li key={gift.id}>
              <GiftCard variant="compact" gift={gift} saved onToggle={favorites.toggle} />
            </li>
          ))}
        </ul>
      )}
      <BottomNav active="favorites" />
    </main>
  );
}

function NotFound() {
  return (
    <main className="screen with-nav">
      <h1>העמוד לא נמצא</h1>
      <p className="empty">ייתכן שהקישור ישן או שהמתנה הוסרה מהקטלוג.</p>
      <PrimaryButton onClick={() => navigate()}>חזרה לדף הבית</PrimaryButton>
      <BottomNav />
    </main>
  );
}

function App() {
  const route = useRoute();
  const stored = useFavorites();
  const { form, submitted, setForm, submit, reset } = useSearchForm();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [expandedFor, setExpandedFor] = useState<string | null>(null);

  const search = useMemo(() => (submitted ? toSearch(form) : null), [form, submitted]);
  const searchKey = useMemo(() => JSON.stringify(search), [search]);
  const results = useMemo(() => (search ? recommend(search) : []), [search]);
  const [page, id] = route;
  const gift = id ? getGift(id) : undefined;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Saving gives the same feedback from every screen: the heart fills and a short message appears.
  const toggleFavorite = useCallback(
    (giftId: string) => {
      const saved = stored.ids.includes(giftId);
      stored.toggle(giftId);
      setToast({ text: saved ? 'הוסר מהמועדפים' : 'נשמר במועדפים', key: Date.now() });
    },
    [stored],
  );
  const favorites: Favorites = { ids: stored.ids, has: stored.has, toggle: toggleFavorite };

  // The results screen needs a submitted search; without one, start from the questionnaire.
  useEffect(() => {
    if (page === 'results' && !search) navigate('search');
  }, [page, search]);

  let screen: ReactNode;
  if (!page) {
    screen = (
      <Home
        favorites={favorites}
        onOccasion={(occasion) => {
          setForm({ ...form, occasion });
          navigate('search');
        }}
      />
    );
  } else if (page === 'search') {
    screen = (
      <Questionnaire
        form={form}
        onChange={setForm}
        onReset={reset}
        onSubmit={() => {
          submit(form);
          navigate('results');
        }}
      />
    );
  } else if (page === 'results') {
    screen = search && (
      <Results
        search={search}
        results={results}
        favorites={favorites}
        expanded={expandedFor === searchKey}
        onExpand={() => setExpandedFor(searchKey)}
      />
    );
  } else if (page === 'gift' && gift) {
    const reasons = results.find((r) => r.gift.id === gift.id)?.reasons ?? [];
    screen = <Details gift={gift} search={reasons.length ? search : null} reasons={reasons} favorites={favorites} />;
  } else if (page === 'stores' && gift) {
    const inResults = results.some((r) => r.gift.id === gift.id);
    screen = <Stores gift={gift} search={inResults ? search : null} favorites={favorites} />;
  } else if (page === 'favorites') {
    screen = <FavoritesScreen favorites={favorites} />;
  } else {
    screen = <NotFound />;
  }

  return (
    <div className="app">
      <Header menuOpen={menuOpen} onMenu={setMenuOpen} favoriteCount={stored.ids.length} />
      {/* Keyed by route so each screen fades in and starts with fresh local state. */}
      <div className="screen-wrap" key={route.join('-')}>
        {screen}
      </div>
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <p className="toast" key={toast.key}>
            {toast.text}
          </p>
        )}
      </div>
    </div>
  );
}

// Hosts that wrap the page in their own document may not carry these from index.html.
document.documentElement.lang = 'he';
document.documentElement.dir = 'rtl';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
