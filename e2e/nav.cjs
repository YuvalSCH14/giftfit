// Bottom bar: present on every screen, shows where you are, counts favorites, tap-to-top.
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
    const nav = page.getByRole('navigation', { name: 'ניווט ראשי' });
    const current = async () => (await nav.locator('a[aria-current="page"]').getAttribute('aria-label').catch(() => null)) || 'none';
    const visible = async () => {
      const box = await nav.boundingBox();
      return !!box && box.y + box.height <= height && (await nav.evaluate((el) => getComputedStyle(el).visibility)) === 'visible';
    };
    await page.goto(URL);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    const catalog = (await page.evaluate(() => fetch('/api/bootstrap').then((r) => r.json()))).catalog;
    const gift = catalog[0];
    for (const [hash, tab] of [['#', 'בית'], ['#find', 'חיפוש מתנה'], ['#favorites', 'המתנות שאהבתי'], ['#profile', 'התחברות או הרשמה'], ['#reminders', 'התחברות או הרשמה']]) {
      await page.goto(URL + hash); await page.waitForTimeout(350);
      log(await visible(), `${width}px bar visible on ${hash}`);
      log((await current()).startsWith(tab), `${width}px ${hash} lights "${tab}" (got "${await current()}")`);
    }
    // a gift page keeps the tab the user came from
    await page.goto(URL + '#favorites'); await page.waitForTimeout(300);
    await page.evaluate((id) => { window.location.hash = 'gift-' + id; }, gift.id);
    await page.locator('.gift-card-detail').waitFor();
    log(await visible() && (await current()).startsWith('המתנות שאהבתי'), `${width}px gift page keeps the previous tab lit`);
    // favorites badge
    await page.getByRole('button', { name: `שמירת ${gift.name} במועדפים` }).click();
    log((await nav.locator('.nav-badge').innerText()) === '1', `${width}px badge counts saved gifts`);
    log((await nav.getByRole('link', { name: /המתנות שאהבתי/ }).getAttribute('aria-label')) === 'המתנות שאהבתי, 1', `${width}px badge is announced`);
    // nothing on the page is covered: the last element ends above the bar when scrolled to the end
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    const lastBottom = await page.evaluate(() => { const main = document.querySelector('main'); const last = main.lastElementChild; return last.getBoundingClientRect().bottom; });
    const navTop = (await nav.boundingBox()).y;
    log(lastBottom <= navTop, `${width}px page content ends above the bar (${Math.round(lastBottom)} <= ${Math.round(navTop)})`);
    await page.screenshot({ path: `${out}/${width}-nav-gift.png` });
    // tapping the current tab scrolls to the top
    await page.goto(URL + '#'); await page.waitForTimeout(300);
    await page.goto(URL + '#gift-' + gift.id); await page.locator('.gift-card-detail').waitFor();
    await nav.getByRole('link', { name: 'בית' }).click();
    await page.waitForFunction(() => location.hash === '' || location.hash === '#');
    await page.evaluate(() => window.scrollTo(0, 300)); await page.waitForTimeout(100);
    await nav.getByRole('link', { name: 'בית' }).click();
    await page.waitForFunction(() => window.scrollY === 0, null, { timeout: 4000 }).then(() => log(true, `${width}px tapping the current tab returns to the top`), () => log(false, `${width}px tapping the current tab returns to the top`));
    await page.screenshot({ path: `${out}/${width}-nav-home.png` });
    // keyboard: every tab is reachable and has a name
    const names = await nav.getByRole('link').evaluateAll((links) => links.map((a) => a.getAttribute('aria-label')));
    log(names.length === 4 && names.every(Boolean), `${width}px four named tabs: ${names.join(' | ')}`);
    const sizes = await nav.getByRole('link').evaluateAll((links) => links.map((a) => { const r = a.getBoundingClientRect(); return Math.min(r.width, r.height); }));
    log(sizes.every((s) => s >= 44), `${width}px touch targets at least 44px (${sizes.map(Math.round).join(', ')})`);
    log(errors.length === 0, `${width}px no page errors ${errors.join(' | ')}`);
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
})().catch((e) => { console.error('ERROR', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
