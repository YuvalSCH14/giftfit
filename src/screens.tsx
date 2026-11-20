import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Review } from './api-types';
import {
  AGE_GROUPS,
  INTERESTS,
  OCCASIONS,
  REGIONS,
  RELATIONS,
  RELAXED_LABELS,
  complementary,
  searchCatalog,
  searchTitle,
  storesFor,
  validateSearch,
  type Gift,
  type Interest,
  type Occasion,
  type Recommendation,
  type Relaxed,
  type Search,
} from './catalog';
import {
  BackButton,
  BottomNav,
  Choices,
  GiftCard,
  GiftMedia,
  HeartButton,
  Price,
  PrimaryButton,
  RatingBadge,
  SearchBar,
  Stars,
  asset,
  illustration,
} from './components';
import { api, errorText, useApp } from './state';
import { EMPTY_FORM, href, navigate, toSearch, type SearchForm } from './storage';

const HOME_OCCASIONS: Occasion[] = ['birthday', 'anniversary', 'barMitzvah', 'brit'];
const INITIAL_RESULTS = 2;
const HOME_TILES = 6;

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });

/** One gift per category, so a short row shows variety. */
function varied(gifts: Gift[], count: number, skip: Set<string> = new Set()): Gift[] {
  const seen = new Set<string>();
  const out: Gift[] = [];
  for (const gift of gifts) {
    if (skip.has(gift.id) || seen.has(gift.category)) continue;
    seen.add(gift.category);
    out.push(gift);
    if (out.length === count) break;
  }
  return out;
}

function Card(props: { gift: Gift; variant: 'tile' | 'compact' | 'large'; footer?: ReactNode; showPrice?: boolean }) {
  const { favorites, ratings } = useApp();
  return (
    <GiftCard
      {...props}
      saved={favorites.has(props.gift.id)}
      onToggle={favorites.toggle}
      rating={ratings[props.gift.id]}
    />
  );
}

export function Home(props: { query: string; onQuery: (query: string) => void }) {
  const { catalog, popular, getGift, search } = useApp();
  // Most-saved gifts first, then the rest of the catalog.
  const saved = popular.map(getGift).filter((gift): gift is Gift => Boolean(gift));
  const tiles = [...saved, ...varied(catalog, HOME_TILES, new Set(saved.map((gift) => gift.id)))].slice(0, HOME_TILES);

  return (
    <main className="screen screen-home with-nav">
      <SearchBar value={props.query} onChange={props.onQuery} onSubmit={() => navigate('find')} />
      <h1 className="home-title">מחפשים מתנה ?</h1>
      <PrimaryButton onClick={() => navigate('search')}>תעזרו לי למצא מתנה</PrimaryButton>

      <section aria-labelledby="occasions-title">
        <h2 id="occasions-title">מתנות לפי אירועים</h2>
        {/* Reference order, left to right: birthday, anniversary, bar/bat mitzvah, brit. */}
        <ul className="occasions" dir="ltr">
          {HOME_OCCASIONS.map((occasion) => (
            <li key={occasion}>
              <button
                type="button"
                onClick={() => {
                  search.setForm({ ...search.form, occasion });
                  navigate('search');
                }}
              >
                <span className="occasion-circle" aria-hidden="true">
                  <img src={illustration(`occasion-${occasion}`)} alt="" width={46} height={46} />
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
          {tiles.map((gift) => (
            <li key={gift.id}>
              <Card
                variant="tile"
                gift={gift}
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
  const { catalog } = useApp();
  const slides = varied([...catalog].reverse(), 4);
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
            <img src={illustration(gift.category)} alt="" width={96} height={96} />
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

export function Questionnaire() {
  const { search } = useApp();
  const { form } = search;
  const [open, setOpen] = useState<RowKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<SearchForm>) => {
    setError(null);
    search.setForm({ ...form, ...patch });
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
    search.submit(form);
    navigate('results');
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
              search.reset();
            }}
          >
            ניקוי הבחירות
          </button>
        )}
      </form>
    </main>
  );
}

export function Results(props: {
  search: Search;
  results: Recommendation[];
  /** Set when nothing matched every choice and these are the closest gifts instead. */
  relaxed: Relaxed[];
  expanded: boolean;
  onExpand: () => void;
}) {
  const { results, relaxed } = props;
  if (results.length === 0) {
    return (
      <main className="screen screen-results">
        <h1>לא מצאנו מתנות מתאימות</h1>
        <p className="empty">אין בקטלוג מתנה בטווח התקציב הזה. נסו להרחיב את התקציב.</p>
        <PrimaryButton onClick={() => navigate('search')}>עריכת החיפוש</PrimaryButton>
      </main>
    );
  }

  const visible = props.expanded ? results : results.slice(0, INITIAL_RESULTS);
  return (
    <main className="screen screen-results">
      <h1>{relaxed.length ? 'לא מצאנו התאמה מלאה' : searchTitle(props.search)}</h1>
      {relaxed.length > 0 && (
        <p className="notice" role="status">
          אלה המתנות הקרובות ביותר, בלי להתחשב ב{relaxed.map((key) => RELAXED_LABELS[key]).join(' וב')}. התקציב נשמר.
        </p>
      )}
      <a className="text-link" href={href('search')}>
        עריכת החיפוש
      </a>
      <ul className="result-list">
        {visible.map(({ gift }) => (
          <li key={gift.id}>
            <Card variant="large" gift={gift} />
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

function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const name = useId();
  return (
    <fieldset className="star-picker">
      <legend>הדירוג שלך</legend>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n}>
          <input type="radio" name={name} checked={value === n} onChange={() => onChange(n)} />
          <img src={asset(n <= value ? 'star-filled.svg' : 'star-empty.svg')} alt="" width={30} height={30} />
          <span className="visually-hidden">{n === 1 ? 'כוכב אחד' : `${n} כוכבים`}</span>
        </label>
      ))}
    </fieldset>
  );
}

function Reviews({ gift }: { gift: Gift }) {
  const { storage, me, ratings, setRatings, toast } = useApp();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const summary = ratings[gift.id];

  const load = useCallback(async () => {
    try {
      const data = await api<{ reviews: Review[] }>('GET', `/reviews?gift=${gift.id}`);
      setReviews(data.reviews);
      const mine = data.reviews.find((review) => review.mine);
      if (mine) {
        setRating(mine.rating);
        setText(mine.text);
      }
    } catch {
      setReviews([]);
    }
  }, [gift.id]);

  useEffect(() => {
    if (storage) void load();
    else setReviews([]);
  }, [storage, load, me?.email]);

  const run = async (path: string, body: object, done: string) => {
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ ratings: typeof ratings }>('POST', path, body);
      setRatings(data.ratings);
      await load();
      toast(done);
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (rating === 0) {
      setError('בחרו דירוג בכוכבים לפני הפרסום.');
      return;
    }
    void run('/reviews', { giftId: gift.id, rating, text }, 'הביקורת פורסמה');
  };

  const mine = reviews?.find((review) => review.mine);
  return (
    <section className="reviews" aria-labelledby="reviews-title">
      <h2 id="reviews-title">ביקורות על המוצר</h2>
      {summary && (
        <p className="reviews-summary">
          <RatingBadge rating={summary} /> מתוך 5 · {summary.count === 1 ? 'ביקורת אחת' : `${summary.count} ביקורות`}
        </p>
      )}
      {reviews === null && <p className="reviews-empty">טוענים ביקורות…</p>}
      {reviews?.length === 0 && <p className="reviews-empty">עדיין אין ביקורות על המוצר הזה.</p>}
      {reviews?.map((review) => (
        <div key={review.createdAt + review.name} className="review">
          <p className="review-head">
            <span>{review.name}</span>
            <Stars count={review.rating} />
          </p>
          {review.text && <p>{review.text}</p>}
          <p className="review-meta">
            {formatDate(review.createdAt)}
            {review.author && !review.mine && (
              <button type="button" className="text-link" disabled={busy} onClick={() => run('/reviews/delete', { giftId: gift.id, author: review.author }, 'הביקורת הוסרה')}>
                הסרה
              </button>
            )}
          </p>
        </div>
      ))}

      {storage && me && (
        <form className="review-form" onSubmit={submit}>
          <h3>{mine ? 'הביקורת שלך' : 'כתיבת ביקורת'}</h3>
          <StarPicker value={rating} onChange={setRating} />
          <label className="field" htmlFor="review-text">
            <span>מה דעתך על המוצר? (לא חובה)</span>
            <textarea id="review-text" rows={3} maxLength={500} value={text} onChange={(event) => setText(event.target.value)} />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" busy={busy}>
            {mine ? 'עדכון הביקורת' : 'פרסום הביקורת'}
          </PrimaryButton>
          {mine && (
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() => {
                setRating(0);
                setText('');
                void run('/reviews/delete', { giftId: gift.id }, 'הביקורת נמחקה');
              }}
            >
              מחיקת הביקורת שלי
            </button>
          )}
        </form>
      )}
      {storage && !me && (
        <p className="reviews-cta">
          <a className="text-link" href={href('profile')}>
            התחברו כדי לכתוב ביקורת
          </a>
        </p>
      )}
    </section>
  );
}

export function Details(props: { gift: Gift; search: Search | null; reasons: string[] }) {
  const { favorites, toast } = useApp();
  const { gift } = props;

  const share = async () => {
    const data = { title: gift.name, text: `${gift.name}, ${gift.price} ₪. מצאתי ב־GiftFit`, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
      toast('הקישור הועתק');
    } catch (problem) {
      // Closing the share sheet is not an error worth reporting.
      if ((problem as Error).name !== 'AbortError') toast('לא הצלחנו לשתף. אפשר להעתיק את הכתובת מהדפדפן.');
    }
  };

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
      <PrimaryButton quiet onClick={share}>
        שיתוף המתנה
      </PrimaryButton>

      <section className="why" aria-labelledby="why-title">
        <h2 id="why-title">למה זה מתאים?</h2>
        {gift.description && <p>{gift.description}</p>}
        {props.reasons.length > 0 && (
          <ul>
            {props.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
        {gift.priceCheckedAt && <p className="sample-tag">המחיר נבדק בחנות ב־{formatDate(gift.priceCheckedAt)} ועשוי להשתנות.</p>}
      </section>

      <Reviews gift={gift} />
      <BottomNav />
    </main>
  );
}

export function Stores({ gift, search }: { gift: Gift; search: Search | null }) {
  const { catalog } = useApp();
  const stores = storesFor(gift, search);
  const others = complementary(gift, catalog);
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
            <p>
              {[store.delivery ? 'משלוח עד הבית' : '', store.regions.length ? `סניפים ב${store.regions.map((r) => REGIONS[r]).join(', ')}` : '']
                .filter(Boolean)
                .join(' · ')}
            </p>
            {store.regions.length > 0 && <p className="sample-tag">לפני שמגיעים לסניף כדאי לוודא שהמוצר במלאי.</p>}
            {store.url ? (
              <a className="store-link" href={store.url} target="_blank" rel="noopener noreferrer">
                מעבר לעמוד המוצר בחנות
              </a>
            ) : (
              <p className="sample-tag">מוצר לדוגמה, אין עדיין קישור לרכישה</p>
            )}
          </li>
        ))}
      </ul>
      {gift.priceCheckedAt && <p className="sample-tag">המחיר נבדק ב־{formatDate(gift.priceCheckedAt)} ועשוי להשתנות.</p>}

      {others.length > 0 && (
        <section aria-labelledby="more-title">
          <h2 id="more-title" className="section-title">
            מוצרים משלימים
          </h2>
          <ul className="grid">
            {others.map((other) => (
              <li key={other.id}>
                <Card variant="compact" gift={other} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <BottomNav />
    </main>
  );
}

export function FavoritesScreen() {
  const { favorites, getGift, me, storage } = useApp();
  const saved = favorites.ids.map(getGift).filter((gift): gift is Gift => Boolean(gift));
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
              <Card variant="compact" gift={gift} />
            </li>
          ))}
        </ul>
      )}
      {storage && !me && saved.length > 0 && (
        <p className="notice">
          המועדפים שמורים רק במכשיר הזה. <a href={href('profile')}>התחברו</a> כדי לראות אותם בכל מכשיר.
        </p>
      )}
      <BottomNav active="favorites" />
    </main>
  );
}

export function Find(props: { query: string; onQuery: (query: string) => void }) {
  const { catalog } = useApp();
  const results = searchCatalog(props.query, catalog);
  const searched = props.query.trim().length > 0;
  return (
    <main className="screen screen-find with-nav">
      <h1>חיפוש מתנה</h1>
      <SearchBar value={props.query} onChange={props.onQuery} onSubmit={() => undefined} autoFocus />
      <p className="end-note" role="status">
        {!searched ? 'כתבו שם של מתנה, נושא או חנות.' : results.length === 0 ? '' : results.length === 1 ? 'נמצאה מתנה אחת' : `נמצאו ${results.length} מתנות`}
      </p>
      {searched && results.length === 0 && (
        <>
          <p className="empty">לא מצאנו מתנה שמתאימה ל״{props.query.trim()}״. אפשר לנסות מילה אחרת או להיעזר בשאלון.</p>
          <PrimaryButton onClick={() => navigate('search')}>לשאלון ההתאמה</PrimaryButton>
        </>
      )}
      {results.length > 0 && (
        <ul className="grid">
          {results.map((gift) => (
            <li key={gift.id}>
              <Card variant="compact" gift={gift} />
            </li>
          ))}
        </ul>
      )}
      <BottomNav active="search" />
    </main>
  );
}

export function NotFound() {
  return (
    <main className="screen with-nav">
      <h1>העמוד לא נמצא</h1>
      <p className="empty">ייתכן שהקישור ישן או שהמתנה הוסרה מהקטלוג.</p>
      <PrimaryButton onClick={() => navigate()}>חזרה לדף הבית</PrimaryButton>
      <BottomNav />
    </main>
  );
}
