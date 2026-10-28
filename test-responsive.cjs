const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (const [name, opts] of [
    ['desktop', { viewport: { width: 1440, height: 900 } }],
    ['laptop', { viewport: { width: 1280, height: 720 } }],
    ['tablet', { viewport: { width: 834, height: 1112 }, isMobile: true, hasTouch: true }],
    ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
    ['phone-landscape', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }],
  ]) {
    const page = await browser.newPage(opts);
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `/tmp/${name}-home.png` });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.getByRole('button', { name: /Jugar ahora/i }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `/tmp/${name}-pre.png` });
    const preOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.getByRole('button', { name: /Entrar a la parrilla/i }).tap().catch(async () => page.getByRole('button', { name: /Entrar a la parrilla/i }).click());
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `/tmp/${name}-race.png` });
    const hud = await page.locator('.race-root').innerText();
    const touchButtons = await page.locator('.touch-btn').count();
    results.push({ name, overflow, preOverflow, touchButtons, errs, hudOk: hud.includes('KM/H'), result: hud.slice(0, 90).replace(/\n/g, '|') });
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
