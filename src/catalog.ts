// Gift model and recommendation logic, shared by the app and the API.

export type Occasion = 'birthday' | 'anniversary' | 'barMitzvah' | 'brit' | 'birth' | 'housewarming';
export type Relation = 'friendF' | 'friendM' | 'partner' | 'parent' | 'sibling' | 'colleague' | 'child';
export type AgeGroup = 'kids' | 'teens' | 'young' | 'adults' | 'seniors';
export type Interest =
  | 'care'
  | 'cooking'
  | 'food'
  | 'sport'
  | 'reading'
  | 'tech'
  | 'music'
  | 'home'
  | 'travel'
  | 'games'
  | 'fashion';
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

// Number ranges are wrapped in left-to-right isolates so they do not flip inside Hebrew text.
const ltr = (range: string) => `\u2066${range}\u2069`;

export const AGE_GROUPS: Record<AgeGroup, string> = {
  kids: 'עד 12',
  teens: ltr('13–17'),
  young: ltr('18–30'),
  adults: ltr('31–50'),
  seniors: '51 ומעלה',
};

export const INTERESTS: Record<Interest, string> = {
  care: 'טיפוח',
  cooking: 'בישול',
  food: 'אוכל ויין',
  sport: 'ספורט',
  reading: 'קריאה',
  tech: 'טכנולוגיה',
  music: 'מוזיקה',
  home: 'בית ועיצוב',
  travel: 'טיולים',
  games: 'משחקים',
  fashion: 'אופנה ותכשיטים',
};

export const REGIONS: Record<Region, string> = {
  telAviv: 'תל אביב',
  jerusalem: 'ירושלים',
  haifa: 'חיפה',
  beerSheva: 'באר שבע',
  sharon: 'השרון',
};

/** Illustration shown for a gift that has no photo. Files live in public/catalog/<key>.svg. */
export const CATEGORIES = {
  care: 'טיפוח',
  perfume: 'בושם',
  candle: 'נרות וריח לבית',
  plant: 'צמחים',
  flowers: 'פרחים',
  kitchen: 'כלי מטבח',
  cookbook: 'ספר בישול',
  wine: 'יין וכוסות',
  chocolate: 'שוקולד ומתוקים',
  coffee: 'קפה ותה',
  book: 'ספר',
  game: 'משחק קופסה',
  toy: 'צעצוע',
  puzzle: 'פאזל',
  headphones: 'אוזניות',
  speaker: 'רמקול',
  gadget: 'גאדג׳ט',
  watch: 'שעון',
  jewelry: 'תכשיט',
  wallet: 'ארנק ותיקים',
  bottle: 'בקבוק',
  backpack: 'תיק גב',
  sport: 'ציוד ספורט',
  baby: 'בגדי תינוקות',
  blanket: 'שמיכה וטקסטיל',
  voucher: 'שובר מתנה',
} as const;
export type Category = keyof typeof CATEGORIES;

export interface Store {
  name: string;
  /** The product page at this store. Only real, checked links; otherwise the UI shows "מוצר לדוגמה". */
  url?: string;
  /** Regions where the store has branches. Empty for an online-only store. */
  regions: Region[];
  /** Whether the store ships the product. */
  delivery: boolean;
}

export interface Gift {
  id: string;
  name: string;
  price: number;
  category: Category;
  /** Optional photo URL, set in the catalog manager. The category illustration is used without it. */
  imageUrl?: string;
  description: string;
  occasions: Occasion[];
  relations: Relation[];
  ages: AgeGroup[];
  interests: Interest[];
  stores: Store[];
  /** ISO date (YYYY-MM-DD) on which the price was last checked at the store. */
  priceCheckedAt?: string;
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

export const MAX_RECOMMENDATIONS = 5;

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
  if (search.fulfilment === 'delivery') return gift.stores.some((store) => store.delivery);
  if (search.fulfilment === 'pickup') {
    const { region } = search;
    if (region) return gift.stores.some((store) => store.regions.includes(region));
    return gift.stores.some((store) => store.regions.length > 0);
  }
  return true;
}

export function formatPrice(price: number): string {
  return `${price} ₪`;
}

/**
 * Ranks catalog gifts for a search. Budget, pickup/delivery, age and occasion are hard filters,
 * and so are the interests when the user picked any. Relation and age add to the score.
 */
export function recommend(search: Search, catalog: Gift[]): Recommendation[] {
  if (validateSearch(search)) return [];
  const interests = search.unsureInterests ? [] : search.interests;

  const ranked: Recommendation[] = [];
  for (const gift of catalog) {
    if (!withinBudget(gift, search) || !available(gift, search)) continue;

    // A gift tagged with ages is never suggested for a different age (wine for a child, a toy for a parent).
    if (search.age && gift.ages.length > 0 && !gift.ages.includes(search.age)) continue;
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
      reasons.push(search.region ? `לחנות יש סניפים ב${REGIONS[search.region]}` : 'אפשר לאסוף מחנות');
    } else if (search.fulfilment === 'delivery') {
      reasons.push('זמין במשלוח');
    }
    ranked.push({ gift, score, reasons });
  }

  ranked.sort((a, b) => b.score - a.score || a.gift.price - b.gift.price);
  return ranked.slice(0, MAX_RECOMMENDATIONS);
}

export type Relaxed = 'interests' | 'occasion' | 'fulfilment';

export const RELAXED_LABELS: Record<Relaxed, string> = {
  interests: 'תחומי העניין',
  occasion: 'סוג האירוע',
  fulfilment: 'אופן הקבלה והאזור',
};

/**
 * When nothing matches every choice, finds the closest gifts by dropping one requirement at a
 * time. The budget is never relaxed. Returns which requirements were dropped.
 */
export function closestMatches(search: Search, catalog: Gift[]): { results: Recommendation[]; relaxed: Relaxed[] } {
  if (validateSearch(search)) return { results: [], relaxed: [] };
  const attempts: Relaxed[][] = [
    ['interests'],
    ['occasion'],
    ['fulfilment'],
    ['interests', 'occasion'],
    ['interests', 'fulfilment'],
    ['occasion', 'fulfilment'],
    ['interests', 'occasion', 'fulfilment'],
  ];
  for (const relaxed of attempts) {
    const looser: Search = {
      ...search,
      interests: relaxed.includes('interests') ? [] : search.interests,
      occasion: relaxed.includes('occasion') ? null : search.occasion,
      fulfilment: relaxed.includes('fulfilment') ? null : search.fulfilment,
      region: relaxed.includes('fulfilment') ? null : search.region,
    };
    // Skip attempts that change nothing (the dropped requirement was never set).
    if (JSON.stringify(looser) === JSON.stringify(search)) continue;
    const results = recommend(looser, catalog);
    if (results.length > 0) return { results, relaxed };
  }
  return { results: [], relaxed: [] };
}

/** Stores relevant to the search: a pickup search in a region lists only stores with branches there. */
export function storesFor(gift: Gift, search: Search | null): Store[] {
  if (search?.fulfilment === 'pickup') {
    const { region } = search;
    return gift.stores.filter((s) => (region ? s.regions.includes(region) : s.regions.length > 0));
  }
  if (search?.fulfilment === 'delivery') return gift.stores.filter((s) => s.delivery);
  return gift.stores;
}

/** Other gifts sharing an interest, for "מוצרים משלימים". */
export function complementary(gift: Gift, catalog: Gift[], limit = 2): Gift[] {
  return catalog
    .filter((other) => other.id !== gift.id)
    .map((other) => ({ other, shared: other.interests.filter((i) => gift.interests.includes(i)).length }))
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared || Math.abs(a.other.price - gift.price) - Math.abs(b.other.price - gift.price))
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

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '') // Hebrew vowel points
    .replace(/[־\-_/.,!?"'׳״()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Free-text search over names, descriptions and tags. Every word must appear somewhere. */
export function searchCatalog(query: string, catalog: Gift[]): Gift[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const scored: { gift: Gift; score: number }[] = [];
  for (const gift of catalog) {
    const name = normalize(gift.name);
    const rest = normalize(
      [
        gift.description,
        CATEGORIES[gift.category],
        ...gift.interests.map((i) => INTERESTS[i]),
        ...gift.occasions.map((o) => OCCASIONS[o]),
        ...gift.stores.map((s) => s.name),
      ].join(' '),
    );
    let score = 0;
    let all = true;
    for (const word of words) {
      // A one-letter Hebrew prefix (ה, ל, ב, ו, מ, ש, כ) is ignored: "לתינוק" finds "תינוק".
      const bare = word.length > 3 && /^[הלבומשכ]/.test(word) ? word.slice(1) : word;
      if (name.includes(word) || name.includes(bare)) score += 3;
      else if (rest.includes(word) || rest.includes(bare)) score += 1;
      else all = false;
    }
    if (all) scored.push({ gift, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.gift.price - b.gift.price).map((entry) => entry.gift);
}

const isOneOf = <K extends string>(labels: Record<K, string>, value: unknown): value is K =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(labels, value);

const listOf = <K extends string>(labels: Record<K, string>, value: unknown): K[] =>
  Array.isArray(value) ? [...new Set(value.filter((item): item is K => isOneOf(labels, item)))] : [];

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const httpsUrl = (value: unknown): string | undefined => {
  const raw = text(value, 500);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Validates and cleans a gift coming from the catalog manager. Returns the gift, or a Hebrew
 * message saying what is wrong.
 */
export function parseGift(input: unknown): { gift: Gift } | { error: string } {
  if (typeof input !== 'object' || input === null) return { error: 'פרטי המוצר חסרים.' };
  const raw = input as Record<string, unknown>;
  const id = text(raw.id, 60).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(id)) return { error: 'מזהה המוצר יכול לכלול רק אותיות באנגלית, ספרות ומקפים.' };
  const name = text(raw.name, 60);
  if (name.length < 2) return { error: 'חסר שם למוצר.' };
  const price = Number(raw.price);
  if (!Number.isFinite(price) || price <= 0 || price > 100000) return { error: 'המחיר צריך להיות מספר חיובי.' };
  if (!isOneOf(CATEGORIES, raw.category)) return { error: 'צריך לבחור קטגוריה.' };
  const occasions = listOf(OCCASIONS, raw.occasions);
  if (occasions.length === 0) return { error: 'צריך לבחור לפחות אירוע אחד.' };
  const interests = listOf(INTERESTS, raw.interests);
  if (interests.length === 0) return { error: 'צריך לבחור לפחות תחום עניין אחד.' };

  const stores: Store[] = [];
  for (const entry of Array.isArray(raw.stores) ? raw.stores.slice(0, 8) : []) {
    if (typeof entry !== 'object' || entry === null) continue;
    const store = entry as Record<string, unknown>;
    const storeName = text(store.name, 60);
    if (!storeName) continue;
    if (text(store.url, 500) && !httpsUrl(store.url)) return { error: `הקישור של ${storeName} צריך להתחיל ב־https://` };
    const regions = listOf(REGIONS, store.regions);
    const delivery = store.delivery === true;
    if (!delivery && regions.length === 0) return { error: `לחנות ${storeName} צריך לסמן משלוח או אזור אחד לפחות.` };
    stores.push({ name: storeName, url: httpsUrl(store.url), regions, delivery });
  }
  if (stores.length === 0) return { error: 'צריך להוסיף לפחות חנות אחת.' };
  if (text(raw.imageUrl, 500) && !httpsUrl(raw.imageUrl)) return { error: 'כתובת התמונה צריכה להתחיל ב־https://' };
  const checked = text(raw.priceCheckedAt, 10);

  return {
    gift: {
      id,
      name,
      price: Math.round(price),
      category: raw.category,
      imageUrl: httpsUrl(raw.imageUrl),
      description: text(raw.description, 200),
      occasions,
      relations: listOf(RELATIONS, raw.relations),
      ages: listOf(AGE_GROUPS, raw.ages),
      interests,
      stores,
      priceCheckedAt: /^\d{4}-\d{2}-\d{2}$/.test(checked) ? checked : undefined,
    },
  };
}
