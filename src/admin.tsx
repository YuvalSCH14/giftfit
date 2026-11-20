// Catalog manager, for accounts listed as managers on the server.
import { useState, type FormEvent } from 'react';
import {
  AGE_GROUPS,
  CATEGORIES,
  INTERESTS,
  OCCASIONS,
  REGIONS,
  RELATIONS,
  type Category,
  type Gift,
  type Store,
} from './catalog';
import { BackButton, Choices, Field, Price, PrimaryButton } from './components';
import { api, errorText, useApp } from './state';
import { href, navigate } from './storage';

const today = () => new Date().toISOString().slice(0, 10);
const newId = () => `gift-${Math.random().toString(36).slice(2, 8)}`;
const emptyStore = (): Store => ({ name: '', url: '', regions: [], delivery: true });

const emptyGift = (): Gift => ({
  id: newId(),
  name: '',
  price: 0,
  category: 'care',
  imageUrl: '',
  description: '',
  occasions: [],
  relations: [],
  ages: [],
  interests: [],
  stores: [emptyStore()],
  priceCheckedAt: today(),
});

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function GiftForm({ initial, isNew }: { initial: Gift; isNew: boolean }) {
  const app = useApp();
  const [gift, setGift] = useState<Gift>(initial);
  const [price, setPrice] = useState(initial.price ? String(initial.price) : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<Gift>) => setGift((current) => ({ ...current, ...patch }));
  const setStore = (index: number, patch: Partial<Store>) =>
    set({ stores: gift.stores.map((store, i) => (i === index ? { ...store, ...patch } : store)) });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ catalog: Gift[] }>('PUT', '/admin/gift', { gift: { ...gift, price: Number(price) }, isNew });
      app.setCatalog(data.catalog);
      app.toast(isNew ? 'המוצר נוסף לקטלוג' : 'השינויים נשמרו');
      navigate('admin');
    } catch (problem) {
      setError(errorText(problem));
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const data = await api<{ catalog: Gift[] }>('POST', '/admin/gift/delete', { id: gift.id });
      app.setCatalog(data.catalog);
      app.toast('המוצר נמחק');
      navigate('admin');
    } catch (problem) {
      setError(errorText(problem));
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={save} noValidate>
      <Field id="gift-name" label="שם המוצר" value={gift.name} onChange={(name) => set({ name })} maxLength={60} required />
      <div className="field-pair">
        <Field id="gift-price" label="מחיר (₪)" type="number" inputMode="numeric" dir="ltr" value={price} onChange={setPrice} required />
        <Field id="gift-checked" label="המחיר נבדק בתאריך" type="date" value={gift.priceCheckedAt ?? ''} onChange={(priceCheckedAt) => set({ priceCheckedAt })} />
      </div>
      <label className="field" htmlFor="gift-description">
        <span>תיאור קצר</span>
        <textarea id="gift-description" rows={2} maxLength={200} value={gift.description} onChange={(event) => set({ description: event.target.value })} />
      </label>
      <label className="field" htmlFor="gift-category">
        <span>קטגוריה (קובעת את האיור)</span>
        <select id="gift-category" value={gift.category} onChange={(event) => set({ category: event.target.value as Category })}>
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Field id="gift-image" label="כתובת תמונה (לא חובה)" dir="ltr" inputMode="url" value={gift.imageUrl ?? ''} onChange={(imageUrl) => set({ imageUrl })} hint="קישור https לתמונה שיש לך זכות להשתמש בה. בלי תמונה יוצג איור הקטגוריה." />

      <Choices legend="מתאים לאירועים" showLegend multiple options={OCCASIONS} selected={gift.occasions} onPick={(key) => set({ occasions: toggle(gift.occasions, key) })} />
      <Choices legend="תחומי עניין" showLegend multiple options={INTERESTS} selected={gift.interests} onPick={(key) => set({ interests: toggle(gift.interests, key) })} />
      <Choices legend="מתאים למי (קרבה)" showLegend multiple options={RELATIONS} selected={gift.relations} onPick={(key) => set({ relations: toggle(gift.relations, key) })} />
      <Choices legend="גילים" showLegend multiple options={AGE_GROUPS} selected={gift.ages} onPick={(key) => set({ ages: toggle(gift.ages, key) })} />

      {gift.stores.map((store, index) => (
        <fieldset key={index} className="store-fields">
          <legend>חנות {index + 1}</legend>
          <Field id={`store-name-${index}`} label="שם החנות" value={store.name} onChange={(name) => setStore(index, { name })} maxLength={60} required />
          <Field id={`store-url-${index}`} label="קישור לעמוד המוצר" dir="ltr" inputMode="url" value={store.url ?? ''} onChange={(url) => setStore(index, { url })} hint="חייב להתחיל ב־https://. בלי קישור המוצר יוצג כ״מוצר לדוגמה״." />
          <label className="check">
            <input type="checkbox" checked={store.delivery} onChange={(event) => setStore(index, { delivery: event.target.checked })} />
            <span>החנות שולחת את המוצר</span>
          </label>
          <Choices legend="אזורים שיש בהם סניפים" showLegend multiple options={REGIONS} selected={store.regions} onPick={(key) => setStore(index, { regions: toggle(store.regions, key) })} />
          {gift.stores.length > 1 && (
            <button type="button" className="text-link" onClick={() => set({ stores: gift.stores.filter((_, i) => i !== index) })}>
              הסרת החנות
            </button>
          )}
        </fieldset>
      ))}
      {gift.stores.length < 8 && (
        <button type="button" className="chip-button" onClick={() => set({ stores: [...gift.stores, emptyStore()] })}>
          הוספת חנות
        </button>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <PrimaryButton type="submit" busy={busy}>
        {isNew ? 'הוספה לקטלוג' : 'שמירת השינויים'}
      </PrimaryButton>
      {!isNew &&
        (confirmDelete ? (
          <p className="danger-zone">
            למחוק את ״{gift.name}״? גם הביקורות עליו יימחקו.{' '}
            <button type="button" className="text-link" disabled={busy} onClick={remove}>
              כן, למחוק
            </button>
            <button type="button" className="text-link" onClick={() => setConfirmDelete(false)}>
              ביטול
            </button>
          </p>
        ) : (
          <button type="button" className="text-link" onClick={() => setConfirmDelete(true)}>
            מחיקת המוצר
          </button>
        ))}
    </form>
  );
}

function CatalogList() {
  const app = useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const [filter, setFilter] = useState('');
  const shown = app.catalog.filter((gift) => gift.name.includes(filter.trim()) || gift.stores.some((store) => store.name.includes(filter.trim())));

  const reset = async () => {
    try {
      const data = await api<{ catalog: Gift[] }>('POST', '/admin/reset');
      app.setCatalog(data.catalog);
      app.toast('הקטלוג שוחזר');
      setConfirmReset(false);
    } catch (problem) {
      app.toast(errorText(problem));
    }
  };

  return (
    <>
      <h1>ניהול הקטלוג</h1>
      <p className="context">{app.catalog.length} מוצרים. שינויים מופיעים לכל המשתמשים מיד.</p>
      <PrimaryButton onClick={() => navigate('admin', 'new')}>מוצר חדש</PrimaryButton>
      <Field id="admin-filter" label="סינון לפי שם מוצר או חנות" value={filter} onChange={setFilter} />
      <ul className="admin-list">
        {shown.map((gift) => (
          <li key={gift.id}>
            <a href={href('admin', gift.id)}>
              <span className="admin-name">{gift.name}</span>
              <span className="admin-meta">
                <Price value={gift.price} /> · {gift.stores.map((store) => store.name).join(', ')}
                {gift.stores.some((store) => !store.url) ? ' · בלי קישור' : ''}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {confirmReset ? (
        <p className="danger-zone">
          לשחזר את קטלוג ברירת המחדל? כל העריכות והמוצרים שהוספת יימחקו.{' '}
          <button type="button" className="text-link" onClick={reset}>
            כן, לשחזר
          </button>
          <button type="button" className="text-link" onClick={() => setConfirmReset(false)}>
            ביטול
          </button>
        </p>
      ) : (
        <button type="button" className="text-link" onClick={() => setConfirmReset(true)}>
          שחזור קטלוג ברירת המחדל
        </button>
      )}
    </>
  );
}

export function Admin({ id }: { id?: string }) {
  const app = useApp();
  const editing = id && id !== 'new' ? app.getGift(id) : undefined;

  let body;
  if (!app.ready) body = <p className="empty">טוענים…</p>;
  else if (!app.me?.isAdmin) {
    body = (
      <>
        <h1>ניהול הקטלוג</h1>
        <p className="empty">המסך הזה פתוח רק למנהלי הקטלוג. אם זה החשבון שלך, התחברו עם כתובת המנהל.</p>
        <PrimaryButton onClick={() => navigate('profile')}>לחשבון</PrimaryButton>
      </>
    );
  } else if (id === 'new') {
    body = (
      <>
        <BackButton />
        <h1>מוצר חדש</h1>
        <GiftForm initial={emptyGift()} isNew />
      </>
    );
  } else if (id && editing) {
    body = (
      <>
        <BackButton />
        <h1>עריכת מוצר</h1>
        <GiftForm key={editing.id} initial={{ ...editing, imageUrl: editing.imageUrl ?? '', stores: editing.stores.map((store) => ({ ...store, url: store.url ?? '' })) }} isNew={false} />
      </>
    );
  } else if (id) {
    body = (
      <>
        <h1>המוצר לא נמצא</h1>
        <PrimaryButton onClick={() => navigate('admin')}>חזרה לקטלוג</PrimaryButton>
      </>
    );
  } else body = <CatalogList />;

  return (
    <main className="screen screen-account">
      {body}
    </main>
  );
}
