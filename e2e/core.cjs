// Core flow: step-by-step questionnaire, results, details, stores, favorites.
// Usage: node e2e/core.cjs <screenshot-dir> [base-url]
const { chromium } = require('playwright');
const out = process.argv[2] || require('node:os').tmpdir();
const URL = process.argv[3] || 'http://localhost:5173/';
let fails = 0;
const log = (ok, msg) => { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + msg); };
(async () => {
  const browser = await chromium.launch();
  for (const [width, height] of [[430, 932], [375, 667]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const w = `${width}px`;
    const shot = async (name) => {
      await page.waitForTimeout(350);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      log(overflow <= 0, `${w} ${name}: no horizontal scroll (overflow ${overflow})`);
      await page.screenshot({ path: `${out}/${width}-${name}.png`, fullPage: true });
    };

    // Questionnaire helpers. Each step shows "שאלה N מתוך 6"; the review shows "סיכום הבחירות".
    const count = page.locator('.wizard-count');
    const atStep = (n) => count.filter({ hasText: `שאלה ${n} מתוך 6` }).waitFor({ timeout: 5000 }).then(() => true, () => false);
    const atReview = () => count.filter({ hasText: 'סיכום הבחירות' }).waitFor({ timeout: 5000 }).then(() => true, () => false);
    const question = () => page.locator('#wizard-question').innerText();
    const pick = (label) => page.getByLabel(label, { exact: true }).click();
    const button = (name) => page.getByRole('button', { name, exact: true });
    const row = (label) => page.locator('.wizard-row', { hasText: label });
    const navBar = page.locator('.bottom-nav');
    // The bar stays mounted and slides away, so "shown" means it does not carry the hidden class.
    const navShown = () => page.locator('.bottom-nav:not(.bottom-nav-hidden)').count().then((n) => n > 0);
    const submit = () => button('מצא לי מתנות מתאימות').click();
    /** The step's main action must be on screen and, while the bottom bar shows, above it. */
    const actionInView = async (name) => {
      const box = await button(name).boundingBox();
      const bar = (await navShown()) ? await navBar.boundingBox() : null;
      return Boolean(box) && box.y >= 0 && box.y + box.height <= (bar ? bar.y : height);
    };

    await page.goto(URL);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    const catalog = (await page.evaluate(() => fetch('/api/bootstrap').then((r) => r.json()))).catalog;
    await shot('home');
    await button('תפריט').click();
    log(await page.getByRole('dialog').getByRole('link', { name: 'שאלון התאמת מתנה' }).isVisible(), `${w} menu opens`);
    await page.keyboard.press('Escape');

    // Opening the questionnaire: first question only, bottom bar still there.
    await button('תעזרו לי למצא מתנה').click();
    await page.waitForURL(/#search/);
    log((await atStep(1)) && (await question()) === 'סוג האירוע', `${w} opens on the first question`);
    log((await page.locator('.wizard-card').count()) === 1 && (await page.locator('.wizard-row').count()) === 0, `${w} one question at a time`);
    log(await navShown(), `${w} bottom bar visible on the untouched first question`);
    log(await actionInView('דילוג על השאלה'), `${w} first step action in view above the bottom bar`);
    await shot('q1-occasion');

    // Skip starts the process: next question, bottom bar gone.
    await button('דילוג על השאלה').click();
    log((await atStep(2)) && (await question()) === 'קרבה למקבל המתנה', `${w} skip moves to the next question`);
    log(!(await navShown()), `${w} bottom bar hidden once the process began`);
    // Back: in-page button and the browser's own back both return to the previous question.
    await button('חזרה').click();
    log(await atStep(1), `${w} back returns to the previous question`);
    log(!(await navShown()), `${w} bottom bar stays hidden after going back`);
    await button('דילוג על השאלה').click();
    await atStep(2);
    await page.goBack();
    log((await atStep(1)) && page.url().includes('#search'), `${w} browser back steps back inside the questionnaire`);

    // Occasion shortcut on the home screen pre-fills the answer and opens on the next question.
    await page.getByRole('link', { name: 'GiftFit, מעבר לדף הבית' }).click();
    await page.waitForURL((url) => !url.hash || url.hash === '#');
    log(await navBar.waitFor({ timeout: 3000 }).then(() => true, () => false), `${w} bottom bar returns after leaving the questionnaire`);
    await button('יום הולדת').click();
    await page.waitForURL(/#search/);
    log((await atStep(2)) && !(await navShown()), `${w} shortcut opens past the answered question, bar hidden`);
    await button('חזרה').click();
    await atStep(1);
    log(await page.getByLabel('יום הולדת', { exact: true }).isChecked(), `${w} shortcut fills occasion`);
    log(await actionInView('המשך'), `${w} answered question offers continue, in view`);
    await button('המשך').click();
    await atStep(2);
    await shot('q2-relation');

    // A single choice moves on by itself.
    await pick('חברה');
    log((await atStep(3)) && (await question()) === 'גיל מקבל המתנה', `${w} answering moves to the next question`);
    await shot('q3-age');
    await button('דילוג על השאלה').click();
    log((await atStep(4)) && (await question()) === 'תחומי עניין', `${w} interests question`);
    await pick('טיפוח');
    await shot('q4-interests');
    log(await actionInView('המשך'), `${w} interests action in view`);
    await button('המשך').click();
    log((await atStep(5)) && (await question()) === 'תקציב', `${w} budget question`);

    // Reversed budget: error on the budget step, values kept, no moving on.
    await page.getByLabel('מינימום (₪)').fill('300'); await page.getByLabel('מקסימום (₪)').fill('100');
    await button('המשך').click();
    log((await page.getByRole('alert').waitFor({ timeout: 3000 }).then(() => true, () => false)) && (await atStep(5)), `${w} reversed budget shows error and stays on the budget step`);
    log(await page.getByLabel('מינימום (₪)').inputValue() === '300' && await page.getByLabel('מקסימום (₪)').inputValue() === '100', `${w} reversed budget keeps values`);
    await shot('q5-budget-error');
    await page.getByLabel('מינימום (₪)').fill('100'); await page.getByLabel('מקסימום (₪)').fill('300');
    await button('המשך').click();
    log((await atStep(6)) && (await question()) === 'מיקום', `${w} location question`);
    await pick('איסוף עצמי');
    await page.getByText('באיזה אזור נוח לאסוף?').waitFor();
    await shot('q6-location');
    await pick('תל אביב');

    // Review: all six answers, each can be changed.
    log(await atReview(), `${w} review follows the last question`);
    const rows = await page.locator('.wizard-row').allInnerTexts();
    const has = (label, value) => rows.some((text) => text.includes(label) && text.includes(value));
    log(rows.length === 6 && has('סוג האירוע', 'יום הולדת') && has('קרבה למקבל המתנה', 'חברה') && has('גיל מקבל המתנה', 'לא נבחר') && has('תחומי עניין', 'טיפוח') && has('תקציב', '100–300') && has('מיקום', 'תל אביב'), `${w} review lists the six answers`);
    log(await actionInView('מצא לי מתנות מתאימות'), `${w} submit stays within the viewport`);
    await shot('review');
    await row('גיל מקבל המתנה').click();
    log((await atStep(3)) && (await button('אישור').isVisible()), `${w} review row opens its question`);
    await button('חזרה').click();
    log(await atReview(), `${w} back from an edited question returns to the review`);
    await row('קרבה למקבל המתנה').click();
    await atStep(2);
    await pick('חבר');
    log(await atReview() && (await row('קרבה למקבל המתנה').innerText()).includes('חבר'), `${w} changing an answer returns to the review`);
    await row('קרבה למקבל המתנה').click();
    await atStep(2);
    await pick('חברה');
    await atReview();
    await submit();

    await page.waitForURL(/#results/);
    await page.locator('.result-list').waitFor();
    log(await navBar.waitFor({ timeout: 3000 }).then(() => true, () => false), `${w} bottom bar visible again on results`);
    const names = await page.locator('.result-list .gift-name').allInnerTexts();
    const shown = names.map((n) => catalog.find((g) => g.name === n));
    log(shown.length > 0 && shown.every((g) => g && g.price >= 100 && g.price <= 300), `${w} results respect the budget: ${shown.map((g) => g && g.price).join(', ')}`);
    log(shown.every((g) => g.interests.includes('care') && g.occasions.includes('birthday') && g.stores.some((s) => s.regions.includes('telAviv'))), `${w} results match interest, occasion and region`);
    log((await page.locator('h1').innerText()) === 'מתנות מתאימות ליום הולדת של חברה', `${w} results heading`);
    await shot('results');
    const gift = shown[0];
    await button(`שמירת ${gift.name} במועדפים`).click();
    log(await page.getByText('נשמר במועדפים').isVisible(), `${w} save shows feedback`);

    // Editing a finished search opens the review with the answers kept.
    await page.getByRole('link', { name: 'עריכת החיפוש' }).click();
    await page.waitForURL(/#search/);
    log(await atReview(), `${w} edit opens the review`);
    log((await row('תקציב').innerText()).includes('100–300') && (await row('מיקום').innerText()).includes('תל אביב') && (await row('סוג האירוע').innerText()).includes('יום הולדת'), `${w} edit keeps values`);
    log(!(await navShown()), `${w} bottom bar hidden while editing`);
    await row('תקציב').click();
    await atStep(5);
    log(await page.getByLabel('מקסימום (₪)').inputValue() === '300', `${w} edited question shows the saved value`);
    await button('אישור').click();
    await atReview();
    await submit();
    await page.waitForURL(/#results/);
    await page.locator('.result-list').waitFor();

    await page.locator('a.gift-link', { hasText: gift.name }).click();
    await page.waitForURL(new RegExp('#gift-' + gift.id));
    await page.locator('.why').waitFor();
    const why = await page.locator('.why').innerText();
    log(['טיפוח', 'יום הולדת', 'חברה', 'תל אביב'].every((word) => why.includes(word)), `${w} details explain matched choices`);
    log(await button(`הסרת ${gift.name} מהמועדפים`).isVisible(), `${w} heart state shared with details`);
    const buy = await button('איפה ניתן לרכוש?').boundingBox();
    const bar = await navBar.boundingBox();
    log(buy.y + buy.height <= bar.y, `${w} purchase button clear of the bottom bar`);
    await shot('details');
    await button('איפה ניתן לרכוש?').click();
    await page.waitForURL(new RegExp('#stores-' + gift.id));
    await page.locator('.store').first().waitFor();
    const link = page.getByRole('link', { name: 'מעבר לעמוד המוצר בחנות' });
    log((await link.getAttribute('href')) === gift.stores[0].url && (await page.locator('main').innerText()).includes('תל אביב'), `${w} stores screen links to the real product page`);
    await shot('stores');
    await button('חזרה').click();
    await page.waitForURL(new RegExp('#gift-' + gift.id));
    await page.getByRole('navigation', { name: 'ניווט ראשי' }).getByRole('link', { name: 'המתנות שאהבתי' }).click();
    await page.getByRole('heading', { name: 'המתנות שאהבתי' }).waitFor();
    log((await page.locator('.grid').innerText()).includes(gift.name), `${w} favourite listed`);
    await page.reload();
    log((await page.locator('.grid').innerText()).includes(gift.name), `${w} favourite survives refresh`);
    const six = catalog.slice(0, 6).map((g) => g.id);
    await page.evaluate((ids) => localStorage.setItem('giftfit:favorites', JSON.stringify(ids)), six);
    await page.reload();
    await shot('favorites');
    for (const id of six) await page.locator('.gift-card', { has: page.locator(`a[href="#gift-${id}"]`) }).getByRole('button').click();
    log(await page.getByText('כאן יופיעו המתנות שסימנת בלב').isVisible(), `${w} empty favourites message`);

    // Clearing starts over: first question, nothing answered, bottom bar back.
    await page.goto(URL + '#search'); await page.reload();
    await atReview();
    await button('ניקוי הבחירות').click();
    log((await atStep(1)) && (await navShown()) && !(await page.getByLabel('יום הולדת', { exact: true }).isChecked()), `${w} clearing returns to an untouched first question with the bar`);
    for (let n = 1; n <= 6; n++) { await atStep(n); await button('דילוג על השאלה').click(); }
    log(await atReview() && (await page.locator('.wizard-row-empty').count()) === 6, `${w} every question can be skipped`);
    await submit(); await page.locator('.result-list').waitFor();
    log((await page.locator('.result-list li').count()) === 2, `${w} two results first`);
    await button('להמלצות נוספות').click();
    log((await page.locator('.result-list li').count()) === 5, `${w} more shows up to five`);

    // A search nothing can satisfy offers a way back to edit it.
    await page.goto(URL + '#search'); await page.reload();
    await atReview();
    await row('תקציב').click();
    await atStep(5);
    await page.getByLabel('מינימום (₪)').fill('5000'); await page.getByLabel('מקסימום (₪)').fill('6000');
    await button('אישור').click();
    await atReview();
    await submit();
    log(await button('עריכת החיפוש').waitFor({ timeout: 5000 }).then(() => true, () => false), `${w} no-match offers edit`);
    log(errors.length === 0, `${w} no console errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
})().catch((e) => { console.error('ERROR', e.message.split('\n').slice(0, 8).join('\n')); process.exit(1); });
