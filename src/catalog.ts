// Demo catalog and recommendation logic for GiftFit.
// All items are sample products: none has a real store link yet.

export type Occasion = 'birthday' | 'anniversary' | 'barMitzvah' | 'brit' | 'birth' | 'housewarming';
export type Relation = 'friendF' | 'friendM' | 'partner' | 'parent' | 'sibling' | 'colleague' | 'child';
export type AgeGroup = 'kids' | 'teens' | 'young' | 'adults' | 'seniors';
export type Interest = 'care' | 'cooking' | 'sport' | 'reading' | 'tech' | 'home' | 'travel' | 'games';
export type Region = 'telAviv' | 'jerusalem' | 'haifa' | 'beerSheva' | 'sharon';
export type Fulfilment = 'pickup' | 'delivery';

export const OCCASIONS: Record<Occasion, string> = {
  birthday: 'יום הולדת',
  anniversary: 'יום נישואין',
  barMitzvah: 'בר/בת מצווה',
  brit: 'ברית/בריתה',
  birth: 'הולדת בן/בת',
  housewarming: 'חנוכת בית',
};

export const RELATIONS: Record<Relation, string> = {
  friendF: 'חברה',
  friendM: 'חבר',
  partner: 'בן/בת זוג',
  parent: 'הורה',
  sibling: 'אח/אחות',
  colleague: 'עמית/ה לעבודה',
  child: 'ילד/ה',
};

export const AGE_GROUPS: Record<AgeGroup, string> = {
  kids: 'עד 12',
  teens: '13–17',
  young: '18–30',
  adults: '31–50',
  seniors: '51 ומעלה',
};

export const INTERESTS: Record<Interest, string> = {
  care: 'טיפוח',
  cooking: 'בישול',
  sport: 'ספורט',
  reading: 'קריאה',
  tech: 'טכנולוגיה',
  home: 'בית ועיצוב',
  travel: 'טיולים',
  games: 'משחקים',
};

export const REGIONS: Record<Region, string> = {
  telAviv: 'תל אביב',
  jerusalem: 'ירושלים',
  haifa: 'חיפה',
  beerSheva: 'באר שבע',
  sharon: 'השרון',
};

export interface Store {
  name: string;
  /** Pickup region, or undefined for a delivery-only seller. */
  region?: Region;
  /** A real product page. Only set when verified; otherwise the UI shows "מוצר לדוגמה". */
  url?: string;
}

export interface Gift {
  id: string;
  name: string;
  price: number;
  image?: string;
  description: string;
  occasions: Occasion[];
  relations: Relation[];
  ages: AgeGroup[];
  interests: Interest[];
  delivery: boolean;
  stores: Store[];
}

export interface Search {
  occasion: Occasion | null;
  relation: Relation | null;
  age: AgeGroup | null;
  interests: Interest[];
  /** "לא בטוחה": the user does not know the recipient's interests. */
  unsureInterests: boolean;
  budgetMin: number | null;
  budgetMax: number | null;
  fulfilment: Fulfilment | null;
  region: Region | null;
}

export const EMPTY_SEARCH: Search = {
  occasion: null,
  relation: null,
  age: null,
  interests: [],
  unsureInterests: false,
  budgetMin: null,
  budgetMax: null,
  fulfilment: null,
  region: null,
};

export interface Recommendation {
  gift: Gift;
  score: number;
  /** Hebrew sentences naming only the choices that actually matched. */
  reasons: string[];
}

const ADULT: AgeGroup[] = ['young', 'adults', 'seniors'];
const demoStore = (region: Region): Store => ({ name: `חנות לדוגמה, ${REGIONS[region]}`, region });
const demoOnline: Store = { name: 'חנות מקוונת לדוגמה' };

export const CATALOG: Gift[] = [
  {
    id: 'care-kit',
    name: 'מארז טיפוח מפנק',
    price: 249,
    image: 'catalog/care.svg',
    description: 'קרם גוף, סבון טבעי ומלח אמבט במארז מתנה.',
    occasions: ['birthday', 'anniversary', 'birth'],
    relations: ['friendF', 'partner', 'parent', 'sibling'],
    ages: ADULT,
    interests: ['care'],
    delivery: true,
    stores: [demoStore('telAviv'), demoStore('sharon'), demoOnline],
  },
  {
    id: 'thermal-bottle',
    name: 'בקבוק תרמי מעוצב',
    price: 149,
    image: 'catalog/bottle.svg',
    description: 'שומר על קור וחום לאורך היום, לאימון או לטיול.',
    occasions: ['birthday', 'barMitzvah'],
    relations: ['friendF', 'friendM', 'colleague', 'sibling'],
    ages: ['teens', 'young', 'adults'],
    interests: ['sport', 'travel'],
    delivery: true,
    stores: [demoStore('telAviv'), demoStore('haifa'), demoOnline],
  },
  {
    id: 'candle-set',
    name: 'סט נרות ושמני גוף',
    price: 300,
    image: 'catalog/candle.svg',
    description: 'שלושה נרות ריחניים ושני שמני גוף לערב רגוע בבית.',
    occasions: ['birthday', 'anniversary', 'housewarming'],
    relations: ['friendF', 'partner', 'parent'],
    ages: ADULT,
    interests: ['care', 'home'],
    delivery: true,
    stores: [demoStore('telAviv'), demoStore('jerusalem'), demoOnline],
  },
  {
    id: 'cookbook',
    name: 'ספר בישול ים־תיכוני',
    price: 129,
    image: 'catalog/cookbook.svg',
    description: 'מאה מתכונים פשוטים לארוחות משפחתיות.',
    occasions: ['birthday', 'housewarming'],
    relations: ['friendF', 'friendM', 'parent', 'sibling', 'colleague'],
    ages: ADULT,
    interests: ['cooking', 'reading'],
    delivery: true,
    stores: [demoStore('jerusalem'), demoStore('haifa'), demoOnline],
  },
  {
    id: 'board-game',
    name: 'משחק קופסה משפחתי',
    price: 179,
    image: 'catalog/game.svg',
    description: 'משחק אסטרטגיה קליל לשניים עד שישה משתתפים.',
    occasions: ['birthday', 'barMitzvah'],
    relations: ['child', 'sibling', 'friendF', 'friendM'],
    ages: ['kids', 'teens', 'young'],
    interests: ['games'],
    delivery: true,
    stores: [demoStore('telAviv'), demoStore('beerSheva'), demoOnline],
  },
  {
    id: 'headphones',
    name: 'אוזניות אלחוטיות',
    price: 349,
    image: 'catalog/headphones.svg',
    description: 'אוזניות קשת עם סינון רעשים וסוללה ל־30 שעות.',
    occasions: ['birthday', 'barMitzvah'],
    relations: ['child', 'sibling', 'partner', 'friendM', 'friendF'],
    ages: ['teens', 'young', 'adults'],
    interests: ['tech', 'sport'],
    delivery: true,
    stores: [demoStore('telAviv'), demoStore('sharon'), demoOnline],
  },
  {
    id: 'baby-set',
    name: 'מארז לידה רך',
    price: 220,
    image: 'catalog/baby.svg',
    description: 'בגד גוף, כובע וחיתול בד מכותנה אורגנית.',
    occasions: ['brit', 'birth'],
    relations: ['friendF', 'friendM', 'sibling', 'colleague'],
    ages: ['young', 'adults'],
    interests: ['home'],
    delivery: true,
    stores: [demoStore('telAviv'), demoStore('jerusalem'), demoOnline],
  },
  {
    id: 'baby-blanket',
    name: 'שמיכת תינוק רקומה',
    price: 160,
    image: 'catalog/blanket.svg',
    description: 'שמיכה נעימה עם אפשרות לרקמת שם.',
    occasions: ['brit', 'birth'],
    relations: ['friendF', 'friendM', 'sibling', 'colleague', 'child'],
    ages: ['young', 'adults'],
    interests: ['home'],
    delivery: true,
    stores: [demoStore('haifa'), demoOnline],
  },
  {
    id: 'plant',
    name: 'עציץ מעוצב לבית',
    price: 119,
    image: 'catalog/plant.svg',
    description: 'צמח קל לטיפול בכלי קרמיקה.',
    occasions: ['housewarming', 'birthday'],
    relations: ['friendF', 'friendM', 'colleague', 'parent'],
    ages: ADULT,
    interests: ['home'],
    delivery: false,
    stores: [demoStore('telAviv'), demoStore('sharon'), demoStore('beerSheva')],
  },
  {
    id: 'wine-set',
    name: 'סט כוסות יין וקרש גבינות',
    price: 280,
    image: 'catalog/wine.svg',
    description: 'זוג כוסות יין וקרש הגשה מעץ שיטה.',
    occasions: ['anniversary', 'housewarming'],
    relations: ['partner', 'parent', 'friendF', 'friendM', 'colleague'],
    ages: ADULT,
    interests: ['cooking', 'home'],
    delivery: true,
    stores: [demoStore('telAviv'), demoStore('jerusalem'), demoOnline],
  },
  {
    id: 'backpack',
    name: 'תיק גב לטיולים',
    price: 399,
    image: 'catalog/backpack.svg',
    description: 'תיק 30 ליטר עם גב מאוורר וכיסוי גשם.',
    occasions: ['barMitzvah', 'birthday'],
    relations: ['child', 'sibling', 'partner', 'friendM', 'friendF'],
    ages: ['teens', 'young', 'adults'],
    interests: ['travel', 'sport'],
    delivery: true,
    stores: [demoStore('haifa'), demoStore('beerSheva'), demoOnline],
  },
  {
    id: 'novel',
    name: 'רומן רב־מכר עם סימנייה',
    price: 89,
    image: 'catalog/book.svg',
    description: 'ספר קריאה עטוף למתנה, עם סימניית עור.',
    occasions: ['birthday'],
    relations: ['friendF', 'friendM', 'parent', 'sibling', 'colleague'],
    ages: ADULT,
    interests: ['reading'],
    delivery: true,
    stores: [demoStore('jerusalem'), demoOnline],
  },
];

export const MAX_RECOMMENDATIONS = 5;

export function getGift(id: string): Gift | undefined {
  return CATALOG.find((gift) => gift.id === id);
}

/** Returns a Hebrew error message when the search cannot be run, otherwise null. */
export function validateSearch(search: Search): string | null {
  const { budgetMin, budgetMax } = search;
  if ((budgetMin !== null && budgetMin < 0) || (budgetMax !== null && budgetMax < 0)) {
    return 'התקציב לא יכול להיות שלילי.';
  }
  if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) {
    return 'המינימום גבוה מהמקסימום. עדכנו את טווח התקציב.';
  }
  return null;
}

function withinBudget(gift: Gift, search: Search): boolean {
  if (search.budgetMin !== null && gift.price < search.budgetMin) return false;
  if (search.budgetMax !== null && gift.price > search.budgetMax) return false;
  return true;
}

function available(gift: Gift, search: Search): boolean {
  if (search.fulfilment === 'delivery') return gift.delivery;
  if (search.fulfilment === 'pickup') {
    const pickup = gift.stores.filter((store) => store.region);
    if (search.region) return pickup.some((store) => store.region === search.region);
    return pickup.length > 0;
  }
  return true;
}

export function formatPrice(price: number): string {
  return `${price} ₪`;
}

/**
 * Ranks catalog gifts for a search. Budget and pickup/delivery are hard filters;
 * occasion, relation, age and interests add to the score. When the user picked
 * interests, a gift must share at least one of them.
 */
export function recommend(search: Search, catalog: Gift[] = CATALOG): Recommendation[] {
  if (validateSearch(search)) return [];
  const interests = search.unsureInterests ? [] : search.interests;

  const ranked: Recommendation[] = [];
  for (const gift of catalog) {
    if (!withinBudget(gift, search) || !available(gift, search)) continue;

    const matchedInterests = interests.filter((interest) => gift.interests.includes(interest));
    if (interests.length > 0 && matchedInterests.length === 0) continue;
    if (search.occasion && !gift.occasions.includes(search.occasion)) continue;

    let score = 0;
    const reasons: string[] = [];
    if (matchedInterests.length > 0) {
      score += 3 * matchedInterests.length;
      reasons.push(`מתאים לתחומי העניין: ${matchedInterests.map((i) => INTERESTS[i]).join(', ')}`);
    }
    if (search.occasion) {
      score += 3;
      reasons.push(`מתאים ל${OCCASIONS[search.occasion]}`);
    }
    if (search.relation && gift.relations.includes(search.relation)) {
      score += 2;
      reasons.push(`מתנה מקובלת ל${RELATIONS[search.relation]}`);
    }
    if (search.age && gift.ages.includes(search.age)) {
      score += 1;
      reasons.push(`מתאים לגיל ${AGE_GROUPS[search.age]}`);
    }
    if (search.budgetMin !== null || search.budgetMax !== null) {
      reasons.push(`המחיר, ${formatPrice(gift.price)}, בתוך התקציב שהגדרת`);
    }
    if (search.fulfilment === 'pickup') {
      reasons.push(search.region ? `אפשר לאסוף ב${REGIONS[search.region]}` : 'אפשר לאסוף מחנות');
    } else if (search.fulfilment === 'delivery') {
      reasons.push('זמין במשלוח');
    }
    ranked.push({ gift, score, reasons });
  }

  ranked.sort((a, b) => b.score - a.score || a.gift.price - b.gift.price);
  return ranked.slice(0, MAX_RECOMMENDATIONS);
}

/** Stores relevant to the search: a pickup search in a region lists only that region. */
export function storesFor(gift: Gift, search: Search | null): Store[] {
  if (search?.fulfilment === 'pickup') {
    return gift.stores.filter((s) => s.region && (!search.region || s.region === search.region));
  }
  if (search?.fulfilment === 'delivery') return gift.stores.filter((s) => !s.region);
  return gift.stores;
}

/** Other gifts sharing an interest, for "מוצרים משלימים". */
export function complementary(gift: Gift, limit = 2, catalog: Gift[] = CATALOG): Gift[] {
  return catalog
    .filter((other) => other.id !== gift.id)
    .map((other) => ({ other, shared: other.interests.filter((i) => gift.interests.includes(i)).length }))
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map((entry) => entry.other);
}

/** Heading for the results screen, built from what the user actually chose. */
export function searchTitle(search: Search | null): string {
  if (!search) return 'מתנות מומלצות';
  const occasion = search.occasion ? `ל${OCCASIONS[search.occasion]}` : '';
  const label = search.relation ? RELATIONS[search.relation] : '';
  const relation = label ? (occasion ? `של ${label}` : `ל${label}`) : '';
  return ['מתנות מתאימות', occasion, relation].filter(Boolean).join(' ');
}
