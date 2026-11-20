// Account screens: sign in / register / profile, and occasion reminders.
import { useState, type FormEvent } from 'react';
import type { Reminder } from './api-types';
import { OCCASIONS, RELATIONS, type Occasion, type Relation } from './catalog';
import { BottomNav, Choices, Field, PrimaryButton } from './components';
import { SOON_DAYS, daysLabel, upcoming } from './reminders';
import { ApiError, api, errorText, useApp } from './state';
import { EMPTY_FORM, href, navigate } from './storage';

function Unavailable({ title }: { title: string }) {
  return (
    <>
      <h1>{title}</h1>
      <p className="empty">החשבונות עדיין לא זמינים, כי מסד הנתונים של האתר לא מחובר. חיפוש מתנות ומועדפים במכשיר הזה פועלים כרגיל.</p>
      <PrimaryButton onClick={() => navigate()}>חזרה לדף הבית</PrimaryButton>
    </>
  );
}

function SignIn() {
  const app = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await app.signIn(email, password);
      else await app.register({ name, email, password, adminCode: adminCode || undefined });
      app.toast(mode === 'login' ? 'התחברת בהצלחה' : 'החשבון נוצר');
    } catch (problem) {
      if (problem instanceof ApiError && problem.code === 'admin_code') setNeedsCode(true);
      setError(errorText(problem));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>{mode === 'login' ? 'התחברות' : 'הרשמה'}</h1>
      <p className="context">חשבון שומר את המועדפים, הביקורות והתזכורות שלך בכל מכשיר.</p>
      <div className="tabs" role="tablist" aria-label="התחברות או הרשמה">
        {(['login', 'register'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mode === tab}
            onClick={() => {
              setMode(tab);
              setError(null);
            }}
          >
            {tab === 'login' ? 'יש לי חשבון' : 'חשבון חדש'}
          </button>
        ))}
      </div>
      <form className="form" onSubmit={submit} noValidate>
        {mode === 'register' && <Field id="account-name" label="שם" value={name} onChange={setName} autoComplete="given-name" required maxLength={40} />}
        <Field id="account-email" label="אימייל" type="email" inputMode="email" dir="ltr" value={email} onChange={setEmail} autoComplete="email" required />
        <Field
          id="account-password"
          label="סיסמה"
          type="password"
          dir="ltr"
          value={password}
          onChange={setPassword}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          hint={mode === 'register' ? '8 תווים לפחות' : undefined}
          required
        />
        {mode === 'register' && needsCode && (
          <Field id="account-code" label="קוד הקמה למנהל" dir="ltr" value={adminCode} onChange={setAdminCode} autoComplete="off" hint="הקוד נמסר למנהל האתר בזמן ההקמה" />
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <PrimaryButton type="submit" busy={busy}>
          {mode === 'login' ? 'התחברות' : 'יצירת חשבון'}
        </PrimaryButton>
      </form>
    </>
  );
}

function Account() {
  const app = useApp();
  const me = app.me!;
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remove = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await app.deleteAccount(password);
      app.toast('החשבון נמחק');
    } catch (problem) {
      setError(errorText(problem));
      setBusy(false);
    }
  };

  return (
    <>
      <h1>שלום, {me.name}</h1>
      <p className="context" dir="ltr">
        {me.email}
      </p>
      <ul className="link-list">
        <li>
          <a href={href('favorites')}>
            המתנות שאהבתי <span>{app.favorites.ids.length}</span>
          </a>
        </li>
        <li>
          <a href={href('reminders')}>
            תזכורות לאירועים <span>{app.reminders.length}</span>
          </a>
        </li>
        {me.isAdmin && (
          <li>
            <a href={href('admin')}>
              ניהול הקטלוג <span>{app.catalog.length}</span>
            </a>
          </li>
        )}
      </ul>
      <PrimaryButton
        quiet
        onClick={() => {
          void app.signOut().then(() => app.toast('התנתקת'), (problem) => app.toast(errorText(problem)));
        }}
      >
        התנתקות
      </PrimaryButton>

      {confirming ? (
        <form className="form danger-zone" onSubmit={remove} noValidate>
          <p>מחיקת החשבון מוחקת לצמיתות את המועדפים, התזכורות והביקורות שלך. כדי לאשר, הקלידו את הסיסמה.</p>
          <Field id="delete-password" label="סיסמה" type="password" dir="ltr" value={password} onChange={setPassword} autoComplete="current-password" required />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" busy={busy}>
            מחיקת החשבון לצמיתות
          </PrimaryButton>
          <button type="button" className="text-link" onClick={() => setConfirming(false)}>
            ביטול
          </button>
        </form>
      ) : (
        <button type="button" className="text-link" onClick={() => setConfirming(true)}>
          מחיקת החשבון
        </button>
      )}
    </>
  );
}

export function Profile() {
  const app = useApp();
  return (
    <main className="screen screen-account with-nav">
      {!app.ready ? <p className="empty">טוענים…</p> : !app.storage ? <Unavailable title="החשבון שלי" /> : app.me ? <Account /> : <SignIn />}
      <BottomNav active="profile" />
    </main>
  );
}

function ReminderForm() {
  const app = useApp();
  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState<Occasion | null>('birthday');
  const [relation, setRelation] = useState<Relation | null>(null);
  const [date, setDate] = useState('');
  const [yearly, setYearly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!date) {
      setError('צריך לבחור תאריך.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ reminders: Reminder[] }>('POST', '/reminders', { name, occasion, relation, date, yearly });
      app.setReminders(data.reminders);
      setName('');
      setDate('');
      app.toast('התזכורת נשמרה');
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <h2>תזכורת חדשה</h2>
      <Field id="reminder-name" label="למי?" value={name} onChange={setName} maxLength={40} required hint="למשל: אמא, נועה מהעבודה" />
      <Choices legend="סוג האירוע" showLegend options={OCCASIONS} selected={occasion ? [occasion] : []} onPick={(key) => setOccasion(key)} />
      <Choices legend="הקרבה שלך (לא חובה)" showLegend options={RELATIONS} selected={relation ? [relation] : []} onPick={(key) => setRelation(relation === key ? null : key)} />
      <Field id="reminder-date" label="תאריך האירוע" type="date" value={date} onChange={setDate} required />
      <label className="check">
        <input type="checkbox" checked={yearly} onChange={(event) => setYearly(event.target.checked)} />
        <span>חוזר כל שנה</span>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <PrimaryButton type="submit" busy={busy}>
        שמירת התזכורת
      </PrimaryButton>
    </form>
  );
}

export function Reminders() {
  const app = useApp();
  const list = upcoming(app.reminders, new Date());
  const past = app.reminders.filter((reminder) => !list.some((item) => item.id === reminder.id));

  const remove = async (id: string) => {
    try {
      const data = await api<{ reminders: Reminder[] }>('POST', '/reminders/delete', { id });
      app.setReminders(data.reminders);
      app.toast('התזכורת נמחקה');
    } catch (problem) {
      app.toast(errorText(problem));
    }
  };

  const findGift = (reminder: Reminder) => {
    app.search.setForm({ ...EMPTY_FORM, occasion: reminder.occasion, relation: reminder.relation });
    navigate('search');
  };

  const item = (reminder: Reminder, days: number | null) => (
    <li key={reminder.id} className={`reminder${days !== null && days <= SOON_DAYS ? ' reminder-soon' : ''}`}>
      <p className="reminder-title">
        {OCCASIONS[reminder.occasion]} של {reminder.name}
      </p>
      <p className="reminder-when">
        {days === null ? 'התאריך עבר' : daysLabel(days)} · {new Date(`${reminder.date}T00:00:00`).toLocaleDateString('he-IL', reminder.yearly ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' })}
        {reminder.yearly ? ' · כל שנה' : ''}
      </p>
      <p className="reminder-actions">
        <button type="button" className="chip-button" onClick={() => findGift(reminder)}>
          למצוא מתנה
        </button>
        <button type="button" className="text-link" onClick={() => remove(reminder.id)} aria-label={`מחיקת התזכורת: ${OCCASIONS[reminder.occasion]} של ${reminder.name}`}>
          מחיקה
        </button>
      </p>
    </li>
  );

  return (
    <main className="screen screen-account with-nav">
      {!app.ready ? (
        <p className="empty">טוענים…</p>
      ) : !app.storage ? (
        <Unavailable title="תזכורות לאירועים" />
      ) : !app.me ? (
        <>
          <h1>תזכורות לאירועים</h1>
          <p className="empty">שמרו ימי הולדת ואירועים, והפעמון יסמן לכם כשהם מתקרבים. התזכורות נשמרות בחשבון.</p>
          <PrimaryButton onClick={() => navigate('profile')}>התחברות או הרשמה</PrimaryButton>
        </>
      ) : (
        <>
          <h1>תזכורות לאירועים</h1>
          {app.reminders.length === 0 ? (
            <p className="empty">עדיין אין תזכורות. הוסיפו אירוע, והפעמון יסמן כשיישארו שבועיים.</p>
          ) : (
            <ul className="reminder-list">
              {list.map((reminder) => item(reminder, reminder.days))}
              {past.map((reminder) => item(reminder, null))}
            </ul>
          )}
          <ReminderForm />
        </>
      )}
      <BottomNav />
    </main>
  );
}
