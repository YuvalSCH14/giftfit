import type { ReactNode } from 'react';
import { formatPrice, type Gift } from './catalog';

/** Assets exported from the Figma file live in public/figma. */
export const asset = (name: string) => `${import.meta.env.BASE_URL}figma/${name}`;
const catalogImage = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export function Header() {
  return (
    // The icon positions are fixed in the design (menu left, bell right), so this row is LTR.
    <header className="header" dir="ltr">
      <button type="button" className="icon-button" aria-label="תפריט (בקרוב)" disabled>
        <img src={asset('menu.svg')} alt="" width={37} height={26} />
      </button>
      <a className="logo" href="#/" aria-label="GiftFit, מעבר לדף הבית">
        <img src={asset('logo.png')} alt="GiftFit" width={151} height={67} />
      </a>
      <button type="button" className="icon-button" aria-label="התראות (בקרוב)" disabled>
        <img src={asset('bell.svg')} alt="" width={35} height={35} />
      </button>
    </header>
  );
}

export type NavTarget = 'home' | 'search' | 'favorites';

export function BottomNav({ active }: { active?: NavTarget }) {
  const current = (target: NavTarget) => (active === target ? 'page' : undefined);
  return (
    // Icon order is fixed left to right: home, search, favorites, profile.
    <nav className="bottom-nav" dir="ltr" aria-label="ניווט ראשי">
      <a href="#/" aria-label="בית" aria-current={current('home')}>
        <img src={asset(active === 'home' ? 'home-active.svg' : 'home.svg')} alt="" width={32} height={32} />
      </a>
      <a href="#/search" aria-label="חיפוש מתנה" aria-current={current('search')}>
        <img src={asset('search.svg')} alt="" width={24} height={24} />
      </a>
      <a href="#/favorites" aria-label="המתנות שאהבתי" aria-current={current('favorites')}>
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
      <img src={asset(saved ? 'heart-filled.svg' : 'heart.svg')} alt="" />
    </button>
  );
}

/** Light media area: the catalog image when there is one, otherwise the Figma placeholder icon. */
export function GiftMedia({ gift }: { gift?: Gift }) {
  return (
    <span className="media">
      {gift?.image ? (
        <img className="media-image" src={catalogImage(gift.image)} alt="" />
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
      <a className="gift-link" href={`#/gift/${gift.id}`}>
        <GiftMedia gift={gift} />
        <span className="info-strip">
          <span className="gift-name">{gift.name}</span>
          {showPrice ? <Price value={gift.price} /> : <span className="visually-hidden">{formatPrice(gift.price)}</span>}
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
