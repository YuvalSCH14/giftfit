const { chromium } = require('playwright');
const out = process.argv[2] || require('node:os').tmpdir();
const URL = 'http://localhost:5173/';
let fails = 0;
const log = (ok, msg) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + msg); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: Number(process.env.SCALE || 1), hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/401|403|409|400/.test(m.text()) && errors.push(m.text()));
  const shot = async (name) => {
    await page.waitForTimeout(350);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    log(overflow <= 0, `${name}: no horizontal scroll (overflow ${overflow})`);
    await page.screenshot({ path: `${out}/x-${name}.png`, fullPage: true });
  };
  const boot = () => page.evaluate(() => fetch('/api/bootstrap').then((r) => r.json()));
  

  await page.goto(URL);
  await page.evaluate(() => document.fonts.ready);
  const first = (await boot()).catalog[0];
  // free-text search from home
  await page.getByRole('searchbox').fill(first.name.split(' ')[0]);
  await page.keyboard.press('Enter');
  await page.waitForURL(/#find/);
  log((await page.locator('.grid .gift-card').count()) >= 1, 'text search finds gifts');
  await shot('find');
  // save a favourite while signed out
  await page.locator('.grid .heart').first().click();
  const savedId = (await page.evaluate(() => JSON.parse(localStorage.getItem('giftfit:favorites'))))[0];

  // register
  await page.getByRole('navigation', { name: 'ניווט ראשי' }).getByRole('link', { name: /החשבון שלי|התחברות או הרשמה/ }).click();
  await page.getByRole('tab', { name: 'חשבון חדש' }).click();
  await shot('register');
  await page.getByLabel('שם').fill('דנה');
  await page.getByLabel('אימייל').fill('dana@example.com');
  await page.getByLabel('סיסמה').fill('short');
  await page.getByRole('button', { name: 'יצירת חשבון' }).click();
  log(await page.getByRole('alert').waitFor({ timeout: 5000 }).then(() => true, () => false), 'short password is refused with a message');
  await page.getByLabel('סיסמה').fill('correct horse');
  await page.getByRole('button', { name: 'יצירת חשבון' }).click();
  await page.getByRole('heading', { name: 'שלום, דנה' }).waitFor();
  log(true, 'registration signs in');
  await page.waitForTimeout(500);
  log((await boot()).favorites.includes(savedId), 'device favourites merge into the account');
  await shot('profile');

  // review
  await page.goto(URL + '#gift-' + first.id); await page.reload();
  await page.getByRole('heading', { name: 'כתיבת ביקורת' }).waitFor();
  await page.getByRole('button', { name: 'פרסום הביקורת' }).click();
  log(await page.getByText('בחרו דירוג בכוכבים').isVisible(), 'review needs a rating');
  await page.getByLabel('4 כוכבים').check({ force: true });
  await page.getByLabel('מה דעתך על המוצר? (לא חובה)').fill('מתנה שהתקבלה בשמחה');
  await page.getByRole('button', { name: 'פרסום הביקורת' }).click();
  await page.getByText('מתנה שהתקבלה בשמחה').first().waitFor();
  log(await page.locator('.reviews-summary').innerText().then((t) => t.includes('4.0') && t.includes('ביקורת אחת')), 'review shows with average');
  await shot('details-review');

  // reminder
  await page.goto(URL + '#reminders'); await page.reload();
  await page.getByLabel('למי?').fill('אמא');
  const soon = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  await page.getByLabel('תאריך האירוע').fill(soon);
  await page.getByRole('button', { name: 'שמירת התזכורת' }).click();
  await page.getByText('יום הולדת של אמא').waitFor();
  log((await page.locator('header a.icon-button').getAttribute('aria-label')).includes('קרובים'), 'bell flags the upcoming reminder');
  await shot('reminders');
  await page.getByRole('button', { name: 'למצוא מתנה' }).click();
  await page.waitForURL(/#search/);
  log((await page.locator('.row-head', { hasText: 'סוג האירוע' }).innerText()).includes('יום הולדת'), 'reminder pre-fills the questionnaire');

  // closest matches
  await page.locator('.row-head', { hasText: 'תחומי עניין' }).click();
  await page.getByLabel('מוזיקה', { exact: true }).click();
  await page.locator('.row-head', { hasText: 'מיקום' }).click();
  await page.getByLabel('איסוף עצמי', { exact: true }).click();
  await page.getByLabel('באר שבע', { exact: true }).click();
  await page.getByRole('button', { name: 'מצא לי מתנות מתאימות' }).click();
  await page.waitForURL(/#results/);
  await page.locator('main h1').waitFor();
  const heading = await page.locator('main h1').innerText();
  log(true, 'results heading: ' + heading);
  await shot('results-closest');

  // sign out clears favourites, sign in restores them
  await page.goto(URL + '#profile'); await page.reload();
  await page.getByRole('button', { name: 'התנתקות' }).click();
  await page.getByRole('heading', { name: 'התחברות' }).waitFor();
  log((await page.evaluate(() => localStorage.getItem('giftfit:favorites'))) === '[]', 'signing out clears favourites from the device');
  await page.getByLabel('אימייל').fill('dana@example.com');
  await page.getByLabel('סיסמה').fill('wrong password');
  await page.getByRole('button', { name: 'התחברות' }).click();
  log(await page.getByText('האימייל או הסיסמה שגויים').waitFor({ timeout: 5000 }).then(() => true, () => false), 'wrong password message');
  await page.getByLabel('סיסמה').fill('correct horse');
  await page.getByRole('button', { name: 'התחברות' }).click();
  await page.getByRole('heading', { name: 'שלום, דנה' }).waitFor();
  await page.waitForTimeout(400);
  log((await page.evaluate(() => localStorage.getItem('giftfit:favorites'))).includes(savedId), 'signing in restores favourites');
  log(!(await page.getByRole('link', { name: /ניהול הקטלוג/ }).count()), 'regular user has no catalog manager');
  await page.goto(URL + '#admin'); await page.reload();
  log(await page.getByText('פתוח רק למנהלי הקטלוג').waitFor({ timeout: 5000 }).then(() => true, () => false), 'admin screen refuses a regular user');
  await page.goto(URL + '#profile'); await page.reload();
  await page.getByRole('button', { name: 'התנתקות' }).click();
  await page.getByRole('heading', { name: 'התחברות' }).waitFor();

  // manager account needs the setup code
  await page.getByRole('tab', { name: 'חשבון חדש' }).click();
  await page.getByLabel('שם').fill('מנהל');
  await page.getByLabel('אימייל').fill('boss@example.com');
  await page.getByLabel('סיסמה').fill('manager pass');
  await page.getByRole('button', { name: 'יצירת חשבון' }).click();
  await page.getByLabel('קוד הקמה למנהל').waitFor();
  log(true, 'manager email asks for the setup code');
  await page.getByLabel('קוד הקמה למנהל').fill('dev-code');
  await page.getByRole('button', { name: 'יצירת חשבון' }).click();
  await page.getByRole('heading', { name: 'שלום, מנהל' }).waitFor();
  await page.getByRole('link', { name: /ניהול הקטלוג/ }).click();
  await page.getByRole('heading', { name: 'ניהול הקטלוג' }).waitFor();
  await shot('admin-list');
  await page.getByRole('button', { name: 'מוצר חדש' }).click();
  await page.getByLabel('שם המוצר').fill('ערכת תה ירוק');
  await page.getByLabel('מחיר (₪)').fill('135');
  await page.getByRole('button', { name: 'הוספה לקטלוג' }).click();
  log(await page.getByRole('alert').waitFor({ timeout: 5000 }).then(() => true, () => false), 'manager form explains what is missing');
  await page.getByLabel('תיאור קצר').fill('שש תערובות תה ירוק בקופסת פח.');
  await page.getByLabel('קטגוריה (קובעת את האיור)').selectOption('coffee');
  await page.locator('fieldset', { hasText: 'מתאים לאירועים' }).first().getByLabel('יום הולדת').check({ force: true });
  await page.locator('fieldset', { hasText: 'תחומי עניין' }).first().getByLabel('אוכל ויין').check({ force: true });
  await page.getByLabel('שם החנות').fill('חנות התה');
  await page.getByLabel('קישור לעמוד המוצר').fill('https://example.com/tea');
  await shot('admin-form');
  await page.getByRole('button', { name: 'הוספה לקטלוג' }).click();
  await page.getByRole('heading', { name: 'ניהול הקטלוג' }).waitFor();
  log(await page.locator('.admin-list').innerText().then((t) => t.includes('ערכת תה ירוק')), 'new product appears in the manager');
  const added = (await boot()).catalog.find((g) => g.name === 'ערכת תה ירוק');
  log(added && added.stores[0].url === 'https://example.com/tea', 'new product is saved for everyone');
  await page.goto(URL + '#stores-' + added.id); await page.reload();
  const link = page.getByRole('link', { name: 'מעבר לעמוד המוצר בחנות' });
  log((await link.getAttribute('href')) === 'https://example.com/tea' && (await link.getAttribute('rel')).includes('noopener'), 'store link points to the real product page');
  await shot('stores-real-link');
  // edit and delete
  await page.goto(URL + '#admin-' + added.id); await page.reload();
  await page.getByLabel('מחיר (₪)').fill('120');
  await page.getByRole('button', { name: 'שמירת השינויים' }).click();
  await page.getByRole('heading', { name: 'ניהול הקטלוג' }).waitFor();
  log((await boot()).catalog.find((g) => g.id === added.id).price === 120, 'edit saves the new price');
  await page.goto(URL + '#admin-' + added.id); await page.reload();
  await page.getByRole('button', { name: 'מחיקת המוצר' }).click();
  await page.getByRole('button', { name: 'כן, למחוק' }).click();
  await page.getByRole('heading', { name: 'ניהול הקטלוג' }).waitFor();
  log(!(await boot()).catalog.some((g) => g.id === added.id), 'delete removes the product');
  await page.goto(URL); await page.reload();
  await shot('home');
  log(errors.length === 0, 'no console errors ' + errors.join(' | '));
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
})().catch((e) => { console.error('ERROR', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
