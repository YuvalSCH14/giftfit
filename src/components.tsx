import { useEffect, useId, useRef, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import type { Rating } from './api-types';
import { formatPrice, type Gift } from './catalog';
import { goBack, href } from './storage';

/** Assets exported from the Figma file live in public/figma. */
export const asset = (name: string) => `${import.meta.env.BASE_URL}figma/${name}`;
/** Illustrations drawn for the app (not from Figma) live in public/catalog. */
export const illustration = (name: string) => `${import.meta.env.BASE_URL}catalog/${name}.svg`;

function MenuDrawer(props: { open: boolean; onClose: () => void; favoriteCount: number; signedIn: boolean; isAdmin: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (props.open && !dialog.open) dialog.showModal();
    if (!props.open && dialog.open) dialog.close();
  }, [props.open]);

  return (
    <dialog
      ref={ref}
      className="menu"
      aria-label="תפריט"
      onClose={props.onClose}
      onClick={(event) => event.target === ref.current && props.onClose()}
    >
      <nav className="menu-panel" onClick={(event) => (event.target as HTMLElement).closest('a') && props.onClose()}>
        <button type="button" className="menu-close" onClick={props.onClose} aria-label="סגירת התפריט">
          ✕
        </button>
        <a href={href()}>דף הבית</a>
        <a href={href('search')}>שאלון התאמת מתנה</a>
        <a href={href('find')}>חיפוש חופשי</a>
        <a href={href('favorites')}>
          המתנות שאהבתי
          {props.favoriteCount > 0 && <span className="menu-count">{props.favoriteCount}</span>}
        </a>
        <a href={href('reminders')}>תזכורות לאירועים</a>
        <a href={href('profile')}>{props.signedIn ? 'החשבון שלי' : 'התחברות או הרשמה'}</a>
        {props.isAdmin && <a href={href('admin')}>ניהול הקטלוג</a>}
      </nav>
    </dialog>
  );
}

export function Header(props: {
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  favoriteCount: number;
  signedIn: boolean;
  isAdmin: boolean;
  /** Number of reminders in the coming two weeks; lights the red dot on the bell. */
  soon: number;
}) {
  return (
    // The icon positions are fixed in the design (menu left, bell right), so this row is LTR.
    <header className="header" dir="ltr">
      <button type="button" className="icon-button" aria-label="תפריט" aria-haspopup="dialog" onClick={() => props.onMenu(true)}>
        <img src={asset('menu.svg')} alt="" width={37} height={26} />
      </button>
      <a className="logo" href={href()} aria-label="GiftFit, מעבר לדף הבית">
        <img src={asset('logo.png')} alt="GiftFit" width={151} height={67} />
      </a>
      <a
        className="icon-button"
        href={href('reminders')}
        aria-label={props.soon > 0 ? `תזכורות לאירועים, ${props.soon} קרובים` : 'תזכורות לאירועים'}
      >
        <img src={asset(props.soon > 0 ? 'bell.svg' : 'bell-quiet.svg')} alt="" width={35} height={35} />
      </a>
      <div dir="rtl">
        <MenuDrawer
          open={props.menuOpen}
          onClose={() => props.onMenu(false)}
          favoriteCount={props.favoriteCount}
          signedIn={props.signedIn}
          isAdmin={props.isAdmin}
        />
      </div>
    </header>
  );
}

export type NavTarget = 'home' | 'search' | 'favorites' | 'profile';

const NAV_ITEMS: { tab: NavTarget; label: string; hash: string; icon: string; activeIcon: string; size: [number, number] }[] = [
  { tab: 'home', label: 'בית', hash: href(), icon: 'home.svg', activeIcon: 'home-active.svg', size: [32, 32] },
  { tab: 'search', label: 'חיפוש מתנה', hash: href('search'), icon: 'search.svg', activeIcon: 'search-active.svg', size: [24, 24] },
  { tab: 'favorites', label: 'המתנות שאהבתי', hash: href('favorites'), icon: 'favorite.svg', activeIcon: 'favorite-active.svg', size: [33.19, 24] },
  { tab: 'profile', label: 'החשבון שלי', hash: href('profile'), icon: 'user.svg', activeIcon: 'user-active.svg', size: [24, 24] },
];

/**
 * The bottom bar. It is always mounted; `hidden` slides it away while a process is under way.
 * Tapping the tab you are already on scrolls back to the top.
 */
export function BottomNav(props: { active?: NavTarget; hidden?: boolean; favoriteCount?: number; signedIn?: boolean }) {
  const count = props.favoriteCount ?? 0;
  const onTap = (event: MouseEvent<HTMLAnchorElement>, hash: string) => {
    const here = window.location.hash || '#';
    if (here !== hash) return;
    event.preventDefault();
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  };
  return (
    // Icon order is fixed left to right: home, search, favorites, profile.
    <nav className={`bottom-nav${props.hidden ? ' bottom-nav-hidden' : ''}`} dir="ltr" aria-label="ניווט ראשי" inert={props.hidden}>
      {NAV_ITEMS.map(({ tab, label, hash, icon, activeIcon, size }) => {
        const active = props.active === tab;
        const badge = tab === 'favorites' && count > 0;
        const name = badge ? `${label}, ${count}` : tab === 'profile' && !props.signedIn ? 'התחברות או הרשמה' : label;
        return (
          <a key={tab} href={hash} aria-label={name} aria-current={active ? 'page' : undefined} onClick={(event) => onTap(event, hash)}>
            <img className={tab === 'favorites' ? 'nav-heart' : undefined} src={asset(active ? activeIcon : icon)} alt="" width={size[0]} height={size[1]} />
            {badge && (
              <span className="nav-badge" aria-hidden="true">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}

interface HeartProps {
  gift: Gift;
  saved: boolean;
  onToggle: (id: string) => void;
  size?: 'small' | 'medium' | 'large';
}

export function HeartButton({ gift, saved, onToggle, size = 'small' }: HeartProps) {
  return (
    <button
      type="button"
      className={`heart heart-${size}`}
      aria-pressed={saved}
      aria-label={saved ? `הסרת ${gift.name} מהמועדפים` : `שמירת ${gift.name} במועדפים`}
      onClick={() => onToggle(gift.id)}
    >
      {/* Keyed so the pop animation replays on every change. */}
      <img key={String(saved)} src={asset(saved ? 'heart-filled.svg' : 'heart.svg')} alt="" />
    </button>
  );
}

/** Light media area: the gift's photo when it has one, otherwise the illustration for its category. */
export function GiftMedia({ gift }: { gift: Gift }) {
  return (
    <span className="media">
      {gift.imageUrl ? (
        <img className="media-photo" src={gift.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <img className="media-image" src={illustration(gift.category)} alt="" />
      )}
    </span>
  );
}

export function Price({ value }: { value: number }) {
  // Explicit direction: the amount comes first and the shekel sign follows it, as in Hebrew text.
  return (
    <bdi className="price" dir="rtl">
      {formatPrice(value)}
    </bdi>
  );
}

/** Average rating with the star from the home frame. Renders nothing until a gift has reviews. */
export function RatingBadge({ rating }: { rating?: Rating }) {
  if (!rating) return null;
  return (
    <span className="rating" dir="ltr" role="img" aria-label={`דירוג ${rating.average} מתוך 5, ${rating.count} ביקורות`}>
      {rating.average.toFixed(1)}
      <img src={asset('star-light.svg')} alt="" width={17} height={24} />
    </span>
  );
}

interface GiftCardProps extends Omit<HeartProps, 'size'> {
  variant: 'tile' | 'compact' | 'large';
  footer?: ReactNode;
  showPrice?: boolean;
  rating?: Rating;
}

/** Gift card used on home (tile), favorites and stores (compact) and results (large). */
export function GiftCard({ gift, saved, onToggle, variant, footer, showPrice = true, rating }: GiftCardProps) {
  return (
    <article className={`gift-card gift-card-${variant}`}>
      <a className="gift-link" href={href('gift', gift.id)}>
        <GiftMedia gift={gift} />
        <span className="info-strip">
          <span className="gift-name">{gift.name}</span>
          {showPrice && <Price value={gift.price} />}
        </span>
      </a>
      <HeartButton gift={gift} saved={saved} onToggle={onToggle} size={variant === 'large' ? 'medium' : 'small'} />
      {rating && (
        <span className="card-rating">
          <RatingBadge rating={rating} />
        </span>
      )}
      {footer}
    </article>
  );
}

export function PrimaryButton(props: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  busy?: boolean;
  quiet?: boolean;
}) {
  return (
    <button
      type={props.type ?? 'button'}
      className={`primary-button${props.quiet ? ' primary-button-quiet' : ''}`}
      onClick={props.onClick}
      disabled={props.busy}
      aria-busy={props.busy || undefined}
    >
      {props.children}
    </button>
  );
}

export function BackButton() {
  return (
    <button type="button" className="back" onClick={goBack}>
      <img src={asset('chevron.svg')} alt="" width={14} height={7} />
      חזרה
    </button>
  );
}

/** Search field based on the search bar component in the Figma file (360×56, fully rounded). */
export function SearchBar(props: { value: string; onChange: (value: string) => void; onSubmit: () => void; autoFocus?: boolean }) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    props.onSubmit();
  };
  return (
    <form className="search-bar" role="search" onSubmit={submit}>
      <input
        id="gift-search"
        type="search"
        enterKeyHint="search"
        placeholder="חיפוש"
        aria-label="חיפוש מתנה לפי שם או נושא"
        value={props.value}
        autoFocus={props.autoFocus}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <button type="submit" aria-label="חיפוש">
        <img src={asset('search-dark.svg')} alt="" width={24} height={24} />
      </button>
    </form>
  );
}

/** Chip group: radio buttons for a single choice, checkboxes when `multiple`. */
export function Choices<K extends string>(props: {
  legend: string;
  options: Record<K, string>;
  selected: K[];
  multiple?: boolean;
  showLegend?: boolean;
  onPick: (key: K) => void;
}) {
  const name = useId();
  return (
    <fieldset className="choices">
      <legend className={props.showLegend ? 'choices-legend' : 'visually-hidden'}>{props.legend}</legend>
      {(Object.entries(props.options) as [K, string][]).map(([key, label]) => (
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

export function Stars({ count }: { count: number }) {
  return (
    <span className="stars" dir="ltr" role="img" aria-label={`${count} מתוך 5 כוכבים`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <img key={n} src={asset(n <= 5 - count ? 'star-empty.svg' : 'star-filled.svg')} alt="" width={24} height={24} />
      ))}
    </span>
  );
}

/** A labelled text field with an optional error line. */
export function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  dir?: 'ltr' | 'rtl';
  required?: boolean;
  hint?: string;
  inputMode?: 'numeric' | 'url' | 'email';
  maxLength?: number;
}) {
  return (
    <label className="field" htmlFor={props.id}>
      <span>{props.label}</span>
      <input
        id={props.id}
        type={props.type ?? 'text'}
        value={props.value}
        dir={props.dir}
        required={props.required}
        autoComplete={props.autoComplete}
        inputMode={props.inputMode}
        maxLength={props.maxLength}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {props.hint && <small>{props.hint}</small>}
    </label>
  );
}
