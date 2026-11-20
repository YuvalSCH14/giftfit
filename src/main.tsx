import { StrictMode, useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
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
import { BottomNav, GiftCard, GiftMedia, Header, HeartButton, Price, PrimaryButton, asset } from './components';
import { navigate, toSearch, useFavorites, useRoute, useSearchForm, type SearchForm } from './storage';

type Favorites = ReturnType<typeof useFavorites>;

const HOME_OCCASIONS: Occasion[] = ['birthday', 'anniversary', 'barMitzvah', 'brit'];
const BEST_SELLERS = ['care-kit', 'board-game', 'baby-set', 'thermal-bottle', 'wine-set'];
const INITIAL_RESULTS = 2;

// Illustrative reviews from the Figma mock-up. Shown only with a "sample" label.
const SAMPLE_REVIEWS = [
  { author: 'יובל', stars: 4, text: 'מוצר מעולה! מומלץ ביותר!!!' },
  { author: 'גל', stars: 5, text: 'מוצר איכותי ומחיר טוב' },
];

const entries = <K extends string>(labels: Record<K, string>) => Object.entries(labels) as [K, string][];

function Home({ favorites, onOccasion }: { favorites: Favorites; onOccasion: (occasion: Occasion) => void }) {
  const bestSellers = BEST_SELLERS.map(getGift).filter((gift): gift is Gift => Boolean(gift));
  return (
    <main className="screen screen-home with-nav">
      <h1 className="home-title">מחפשים מתנה ?</h1>
      <PrimaryButton onClick={() => navigate('/search')}>תעזרו לי למצא מתנה</PrimaryButton>

      <section aria-labelledby="occasions-title">
        <h2 id="occasions-title">מתנות לפי אירועים</h2>
        {/* Reference order, left to right: birthday, anniversary, bar/bat mitzvah, brit. */}
        <ul className="occasions" dir="ltr">
          {HOME_OCCASIONS.map((occasion) => (
            <li key={occasion}>
              <button type="button" onClick={() => onOccasion(occasion)}>
                <span className="occasion-circle" aria-hidden="true" />
                <span dir="rtl">{OCCASIONS[occasion].replace('/', '/\u200b')}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="best-title">
        <h2 id="best-title">המתנות הנמכרות ביותר</h2>
        <ul className="tile-row">
          {bestSellers.map((gift) => (
            <li key={gift.id}>
              <GiftCard
                variant="tile"
                gift={gift}
                saved={favorites.has(gift.id)}
                onToggle={favorites.toggle}
                footer={
                  <p className="tile-caption">
                    <span>{OCCASIONS[gift.occasions[0]]}</span>
                    <Price value={gift.price} />
                  </p>
                }
                showPrice={false}
              />
            </li>
          ))}
        </ul>
      </section>
      <BottomNav active="home" />
    </main>
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
  // Numbers read left to right even inside Hebrew text.
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

type RowKey = 'occasion' | 'relation' | 'age' | 'interests' | 'budget' | 'location';

function Questionnaire(props: { form: SearchForm; onChange: (form: SearchForm) => void; onSubmit: () => void }) {
  const { form, onChange } = props;
  const [open, setOpen] = useState<RowKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<SearchForm>) => {
    setError(null);
    onChange({ ...form, ...patch });
  };
  const toggleRow = (key: RowKey) => setOpen((current) => (current === key ? null : key));
  const pick = <K extends 'occasion' | 'relation' | 'age' | 'fulfilment' | 'region'>(field: K, key: SearchForm[K]) =>
    set({ [field]: form[field] === key ? null : key } as Partial<SearchForm>);
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

  return (
    <main className="screen screen-search">
      <div className="gallery" aria-hidden="true">
        <div className="gallery-media">
          <img src={asset('image-placeholder.svg')} alt="" width={48} height={48} />
        </div>
        <div className="gallery-dots" dir="ltr">
          <span />
          <span />
          <span className="current" />
          <span />
        </div>
      </div>

      <form className="questionnaire" onSubmit={submit} noValidate>
        <h1>למי המתנה?</h1>
        <div className="rows">
          <Row label="סוג האירוע" value={form.occasion ? OCCASIONS[form.occasion] : ''} open={open === 'occasion'} onToggle={() => toggleRow('occasion')}>
            <Choices legend="סוג האירוע" options={OCCASIONS} selected={form.occasion ? [form.occasion] : []} onPick={(k) => pick('occasion', k)} />
          </Row>
          <Row label="קרבה למקבל המתנה" value={form.relation ? RELATIONS[form.relation] : ''} open={open === 'relation'} onToggle={() => toggleRow('relation')}>
            <Choices legend="קרבה למקבל המתנה" options={RELATIONS} selected={form.relation ? [form.relation] : []} onPick={(k) => pick('relation', k)} />
          </Row>
          <Row label="גיל מקבל המתנה" value={form.age ? AGE_GROUPS[form.age] : ''} open={open === 'age'} onToggle={() => toggleRow('age')}>
            <Choices legend="גיל מקבל המתנה" options={AGE_GROUPS} selected={form.age ? [form.age] : []} onPick={(k) => pick('age', k)} />
          </Row>
          <Row label="תחומי עניין" value={interestsValue} open={open === 'interests'} onToggle={() => toggleRow('interests')}>
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
              <label>
                <span>מינימום (₪)</span>
                <input dir="ltr" type="number" inputMode="numeric" min={0} step={10} value={form.budgetMin} onChange={(e) => set({ budgetMin: e.target.value })} aria-invalid={error ? true : undefined} aria-describedby={error ? 'budget-error' : undefined} />
              </label>
              <label>
                <span>מקסימום (₪)</span>
                <input dir="ltr" type="number" inputMode="numeric" min={0} step={10} value={form.budgetMax} onChange={(e) => set({ budgetMax: e.target.value })} aria-invalid={error ? true : undefined} aria-describedby={error ? 'budget-error' : undefined} />
              </label>
            </div>
            {error && (
              <p id="budget-error" className="error" role="alert">
                {error}
              </p>
            )}
          </Row>
          <Row label="מיקום" value={locationValue} open={open === 'location'} onToggle={() => toggleRow('location')}>
            <Choices legend="אופן קבלה" options={{ pickup: 'איסוף עצמי', delivery: 'משלוח' }} selected={form.fulfilment ? [form.fulfilment] : []} onPick={(k) => pick('fulfilment', k)} />
            {form.fulfilment === 'pickup' && (
              <>
                <p className="hint">באיזה אזור נוח לאסוף?</p>
                <Choices legend="אזור איסוף" options={REGIONS} selected={form.region ? [form.region] : []} onPick={(k) => pick('region', k)} />
              </>
            )}
          </Row>
        </div>
        <PrimaryButton type="submit">מצא לי מתנות מתאימות</PrimaryButton>
      </form>
    </main>
  );
}

function EditSearchLink() {
  return (
    <a className="text-link" href="#/search">
      עריכת החיפוש
    </a>
  );
}

function Results({ search, results, favorites }: { search: Search; results: Recommendation[]; favorites: Favorites }) {
  const [shown, setShown] = useState(INITIAL_RESULTS);
  const visible = results.slice(0, shown);

  if (results.length === 0) {
    return (
      <main className="screen screen-results">
        <h1>לא מצאנו מתנות מתאימות</h1>
        <p className="empty">אין בקטלוג פריט שמתאים לכל הבחירות. נסו להרחיב את התקציב, לשנות אזור או לבחור פחות תחומי עניין.</p>
        <PrimaryButton onClick={() => navigate('/search')}>עריכת החיפוש</PrimaryButton>
      </main>
    );
  }

  return (
    <main className="screen screen-results">
      <h1>{searchTitle(search)}</h1>
      <EditSearchLink />
      <ul className="result-list">
        {visible.map(({ gift }) => (
          <li key={gift.id}>
            <GiftCard variant="large" gift={gift} saved={favorites.has(gift.id)} onToggle={favorites.toggle} />
          </li>
        ))}
      </ul>
      {shown < results.length ? (
        <PrimaryButton onClick={() => setShown(results.length)}>להמלצות נוספות</PrimaryButton>
      ) : (
        <p className="empty" role="status">
          {results.length > INITIAL_RESULTS ? 'אלה כל ההמלצות לחיפוש הזה.' : ''}
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
      <h1>{searchTitle(props.search)}</h1>
      <article className="gift-card gift-card-detail">
        <GiftMedia gift={gift} />
        <div className="info-strip">
          <span className="gift-name">{gift.name}</span>
          <Price value={gift.price} />
        </div>
        <HeartButton gift={gift} saved={favorites.has(gift.id)} onToggle={favorites.toggle} size="large" />
      </article>

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

      <PrimaryButton onClick={() => navigate(`/stores/${gift.id}`)}>איפה ניתן לרכוש?</PrimaryButton>

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
      <h1>{stores.length === 0 ? 'לא נמצאו חנויות' : count}</h1>
      <p className="context">
        עבור <a href={`#/gift/${gift.id}`}>{gift.name}</a>, <Price value={gift.price} />
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
  const saved = favorites.ids.map(getGift).filter((gift): gift is Gift => Boolean(gift));
  return (
    <main className="screen screen-favorites with-nav">
      <h1>המתנות שאהבתי</h1>
      {saved.length === 0 ? (
        <p className="empty">כאן יופיעו המתנות שסימנת בלב</p>
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
      <PrimaryButton onClick={() => navigate('/')}>חזרה לדף הבית</PrimaryButton>
      <BottomNav />
    </main>
  );
}

function App() {
  const route = useRoute();
  const favorites = useFavorites();
  const { form, submitted, setForm, submit } = useSearchForm();
  const search = useMemo(() => (submitted ? toSearch(form) : null), [form, submitted]);
  const results = useMemo(() => (search ? recommend(search) : []), [search]);
  const [page, id] = route;
  const gift = id ? getGift(id) : undefined;

  // The results screen needs a submitted search; without one, start from the questionnaire.
  useEffect(() => {
    if (page === 'results' && !search) navigate('/search');
  }, [page, search]);

  let screen: ReactNode;
  if (!page) {
    screen = (
      <Home
        favorites={favorites}
        onOccasion={(occasion) => {
          setForm({ ...form, occasion });
          navigate('/search');
        }}
      />
    );
  } else if (page === 'search') {
    screen = (
      <Questionnaire
        form={form}
        onChange={setForm}
        onSubmit={() => {
          submit(form);
          navigate('/results');
        }}
      />
    );
  } else if (page === 'results' && search) {
    // Keyed by the search so "show more" resets for a new search.
    screen = <Results key={JSON.stringify(search)} search={search} results={results} favorites={favorites} />;
  } else if (page === 'gift' && gift) {
    const reasons = results.find((r) => r.gift.id === gift.id)?.reasons ?? [];
    screen = <Details gift={gift} search={reasons.length ? search : null} reasons={reasons} favorites={favorites} />;
  } else if (page === 'stores' && gift) {
    const inResults = results.some((r) => r.gift.id === gift.id);
    screen = <Stores gift={gift} search={inResults ? search : null} favorites={favorites} />;
  } else if (page === 'favorites') {
    screen = <FavoritesScreen favorites={favorites} />;
  } else if (page === 'results') {
    screen = null;
  } else {
    screen = <NotFound />;
  }

  return (
    <div className="app">
      <Header />
      {screen}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
