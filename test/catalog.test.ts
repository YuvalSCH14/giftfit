import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  EMPTY_SEARCH,
  MAX_RECOMMENDATIONS,
  OCCASIONS,
  complementary,
  getGift,
  recommend,
  searchTitle,
  storesFor,
  validateSearch,
  type Occasion,
  type Search,
} from '../src/catalog';

const friendCare: Search = {
  ...EMPTY_SEARCH,
  occasion: 'birthday',
  relation: 'friendF',
  interests: ['care'],
  budgetMin: 200,
  budgetMax: 300,
  fulfilment: 'pickup',
  region: 'telAviv',
};

const ids = (search: Search) => recommend(search).map((r) => r.gift.id);

describe('catalog', () => {
  it('has 12 demo items with unique ids and no unverified store links', () => {
    expect(CATALOG).toHaveLength(12);
    expect(new Set(CATALOG.map((g) => g.id)).size).toBe(12);
    expect(CATALOG.flatMap((g) => g.stores).every((s) => s.url === undefined)).toBe(true);
  });

  it('has tagged gifts for every occasion, including the home shortcuts', () => {
    for (const occasion of Object.keys(OCCASIONS) as Occasion[]) {
      expect(ids({ ...EMPTY_SEARCH, occasion }).length).toBeGreaterThan(0);
    }
  });
});

describe('recommend', () => {
  it('finds the 249 ₪ care kit for a friend, care, birthday, 200–300 ₪, pickup in Tel Aviv', () => {
    const results = recommend(friendCare);
    const careKit = results.find((r) => r.gift.id === 'care-kit');
    expect(careKit?.gift.price).toBe(249);
    const reasons = careKit!.reasons.join(' | ');
    expect(reasons).toContain('טיפוח');
    expect(reasons).toContain('יום הולדת');
    expect(reasons).toContain('חברה');
    expect(reasons).toContain('תל אביב');
    expect(reasons).toContain('249');
  });

  it('only gives reasons for choices that matched', () => {
    const [first] = recommend({ ...EMPTY_SEARCH, interests: ['care'] });
    expect(first.reasons).toHaveLength(1);
    expect(first.reasons[0]).toContain('טיפוח');
  });

  it('excludes the 149 ₪ bottle and allows a matching gift at exactly 300 ₪', () => {
    const found = ids(friendCare);
    expect(found).not.toContain('thermal-bottle');
    expect(found).toContain('candle-set');
    expect(getGift('candle-set')?.price).toBe(300);
  });

  it('treats budget bounds as inclusive', () => {
    expect(ids({ ...EMPTY_SEARCH, budgetMin: 249, budgetMax: 249 })).toEqual(['care-kit']);
  });

  it('filters pickup searches by region', () => {
    const haifa = recommend({ ...EMPTY_SEARCH, fulfilment: 'pickup', region: 'haifa' });
    expect(haifa.length).toBeGreaterThan(0);
    for (const { gift } of haifa) {
      expect(gift.stores.some((s) => s.region === 'haifa')).toBe(true);
    }
    expect(ids({ ...friendCare, region: 'beerSheva' })).not.toContain('care-kit');
  });

  it('keeps pickup-only gifts out of delivery searches', () => {
    const all = recommend({ ...EMPTY_SEARCH, fulfilment: 'delivery', interests: ['home'] });
    expect(all.map((r) => r.gift.id)).not.toContain('plant');
  });

  it('supports several interests and ranks gifts matching more of them first', () => {
    const results = recommend({ ...EMPTY_SEARCH, interests: ['care', 'home'] });
    expect(results[0].gift.id).toBe('candle-set');
    expect(results.map((r) => r.gift.id)).toContain('care-kit');
  });

  it('ignores interests when the user is not sure', () => {
    const unsure = ids({ ...friendCare, interests: ['tech'], unsureInterests: true });
    expect(unsure).toContain('care-kit');
    expect(ids({ ...friendCare, interests: ['tech'] })).toEqual([]);
  });

  it('returns at most five recommendations', () => {
    expect(recommend(EMPTY_SEARCH)).toHaveLength(MAX_RECOMMENDATIONS);
  });

  it('returns nothing for an impossible search', () => {
    expect(recommend({ ...friendCare, budgetMin: 5000, budgetMax: 6000 })).toEqual([]);
  });
});

describe('validateSearch', () => {
  it('rejects a reversed budget and accepts open-ended ones', () => {
    expect(validateSearch({ ...EMPTY_SEARCH, budgetMin: 300, budgetMax: 200 })).toMatch(/מינימום/);
    expect(recommend({ ...EMPTY_SEARCH, budgetMin: 300, budgetMax: 200 })).toEqual([]);
    expect(validateSearch({ ...EMPTY_SEARCH, budgetMin: 200 })).toBeNull();
    expect(validateSearch({ ...EMPTY_SEARCH, budgetMin: 200, budgetMax: 200 })).toBeNull();
  });
});

describe('helpers', () => {
  it('builds the results heading from the chosen occasion and relation', () => {
    expect(searchTitle(friendCare)).toBe('מתנות מתאימות ליום הולדת של חברה');
    expect(searchTitle({ ...EMPTY_SEARCH, relation: 'parent' })).toBe('מתנות מתאימות להורה');
    expect(searchTitle(EMPTY_SEARCH)).toBe('מתנות מתאימות');
  });

  it('lists only the stores that fit a pickup search', () => {
    const stores = storesFor(getGift('care-kit')!, friendCare);
    expect(stores).toHaveLength(1);
    expect(stores[0].region).toBe('telAviv');
    expect(storesFor(getGift('care-kit')!, null)).toHaveLength(3);
  });

  it('suggests complementary gifts that share an interest', () => {
    const others = complementary(getGift('care-kit')!);
    expect(others.map((g) => g.id)).toEqual(['candle-set']);
    expect(complementary(getGift('candle-set')!).length).toBe(2);
  });
});
