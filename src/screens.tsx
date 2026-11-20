import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import type { Review } from './api-types';
import {
  OCCASIONS,
  REGIONS,
  RELAXED_LABELS,
  complementary,
  searchCatalog,
  searchTitle,
  storesFor,
  type Gift,
  type Occasion,
  type Recommendation,
  type Relaxed,
  type Search,
} from './catalog';
import {
  BackButton,
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
import { varied } from './questionnaire';
import { api, errorText, useApp } from './state';
import { href, navigate } from './storage';

const HOME_OCCASIONS: Occasion[] = ['birthday', 'anniversary', 'barMitzvah', 'brit'];
const INITIAL_RESULTS = 2;
const HOME_TILES = 6;

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });

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
    <main className="screen screen-home">
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
    <main className="screen screen-details">
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
    </main>
  );
}

export function Stores({ gift, search }: { gift: Gift; search: Search | null }) {
  const { catalog } = useApp();
  const stores = storesFor(gift, search);
  const others = complementary(gift, catalog);
  const count = stores.length === 1 ? 'נמצאה חנות אחת' : `נמצאו ${stores.length} חנויות`;
  return (
    <main className="screen screen-stores">
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
    </main>
  );
}

export function FavoritesScreen() {
  const { favorites, getGift, me, storage } = useApp();
  const saved = favorites.ids.map(getGift).filter((gift): gift is Gift => Boolean(gift));
  return (
    <main className="screen screen-favorites">
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
    </main>
  );
}

export function Find(props: { query: string; onQuery: (query: string) => void }) {
  const { catalog } = useApp();
  const results = searchCatalog(props.query, catalog);
  const searched = props.query.trim().length > 0;
  return (
    <main className="screen screen-find">
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
    </main>
  );
}

export function NotFound() {
  return (
    <main className="screen">
      <h1>העמוד לא נמצא</h1>
      <p className="empty">ייתכן שהקישור ישן או שהמתנה הוסרה מהקטלוג.</p>
      <PrimaryButton onClick={() => navigate()}>חזרה לדף הבית</PrimaryButton>
    </main>
  );
}
