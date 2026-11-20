import { useEffect, useRef, type ReactNode } from 'react';
import { formatPrice, type Gift } from './catalog';
import { goBack, href } from './storage';

/** Assets exported from the Figma file live in public/figma. */
export const asset = (name: string) => `${import.meta.env.BASE_URL}figma/${name}`;
/** Demo illustrations (not from Figma) live in public/catalog. */
export const illustration = (path: string) => `${import.meta.env.BASE_URL}${path}`;

function MenuDrawer({ open, onClose, favoriteCount }: { open: boolean; onClose: () => void; favoriteCount: number }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="menu"
      aria-label="תפריט"
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
    >
      <nav className="menu-panel" onClick={(event) => (event.target as HTMLElement).closest('a') && onClose()}>
        <button type="button" className="menu-close" onClick={onClose} aria-label="סגירת התפריט">
          ✕
        </button>
        <a href={href()}>דף הבית</a>
        <a href={href('search')}>חיפוש מתנה</a>
        <a href={href('favorites')}>
          המתנות שאהבתי
          {favoriteCount > 0 && <span className="menu-count">{favoriteCount}</span>}
        </a>
      </nav>
    </dialog>
  );
}

export function Header(props: { menuOpen: boolean; onMenu: (open: boolean) => void; favoriteCount: number }) {
  return (
    // The icon positions are fixed in the design (menu left, bell right), so this row is LTR.
    <header className="header" dir="ltr">
      <button type="button" className="icon-button" aria-label="תפריט" aria-haspopup="dialog" onClick={() => props.onMenu(true)}>
        <img src={asset('menu.svg')} alt="" width={37} height={26} />
      </button>
      <a className="logo" href={href()} aria-label="GiftFit, מעבר לדף הבית">
        <img src={asset('logo.png')} alt="GiftFit" width={151} height={67} />
      </a>
      <button type="button" className="icon-button" aria-label="התראות (בקרוב)" disabled>
        <img src={asset('bell.svg')} alt="" width={35} height={35} />
      </button>
      <div dir="rtl">
        <MenuDrawer open={props.menuOpen} onClose={() => props.onMenu(false)} favoriteCount={props.favoriteCount} />
      </div>
    </header>
  );
}

export type NavTarget = 'home' | 'search' | 'favorites';

export function BottomNav({ active }: { active?: NavTarget }) {
  const current = (target: NavTarget) => (active === target ? 'page' : undefined);
  return (
    // Icon order is fixed left to right: home, search, favorites, profile.
    <nav className="bottom-nav" dir="ltr" aria-label="ניווט ראשי">
      <a href={href()} aria-label="בית" aria-current={current('home')}>
        <img src={asset(active === 'home' ? 'home-active.svg' : 'home.svg')} alt="" width={32} height={32} />
      </a>
      <a href={href('search')} aria-label="חיפוש מתנה" aria-current={current('search')}>
        <img src={asset('search.svg')} alt="" width={24} height={24} />
      </a>
      <a href={href('favorites')} aria-label="המתנות שאהבתי" aria-current={current('favorites')}>
        <img
          className="nav-heart"
          src={asset(active === 'favorites' ? 'favorite-active.svg' : 'favorite.svg')}
          alt=""
          width={33.19}
          height={24}
        />
      </a>
      <button type="button" aria-label="פרופיל (בקרוב)" disabled>
        <img src={asset('user.svg')} alt="" width={24} height={24} />
      </button>
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

/** Light media area: the catalog image when there is one, otherwise the Figma placeholder icon. */
export function GiftMedia({ gift }: { gift?: Gift }) {
  return (
    <span className="media">
      {gift?.image ? (
        <img className="media-image" src={illustration(gift.image)} alt="" />
      ) : (
        <img className="media-placeholder" src={asset('image-placeholder.svg')} alt="" />
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

interface GiftCardProps extends Omit<HeartProps, 'size'> {
  variant: 'tile' | 'compact' | 'large';
  footer?: ReactNode;
  showPrice?: boolean;
}

/** Gift card used on home (tile), favorites and stores (compact) and results (large). */
export function GiftCard({ gift, saved, onToggle, variant, footer, showPrice = true }: GiftCardProps) {
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
      {footer}
    </article>
  );
}

export function PrimaryButton(props: { children: ReactNode; onClick?: () => void; type?: 'button' | 'submit' }) {
  return (
    <button type={props.type ?? 'button'} className="primary-button" onClick={props.onClick}>
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
