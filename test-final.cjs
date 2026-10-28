const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  // Pre-race fit at laptop and desktop
  for (const [name, w, h] of [['laptop', 1280, 720], ['desktop', 1440, 900]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Jugar ahora/i }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `/tmp/fit-${name}.png` });
    const scroll = await page.evaluate(() => {
      const el = document.querySelector('div.overflow-y-auto');
      return el ? { sh: el.scrollHeight, ch: el.clientHeight } : null;
    });
    const startVisible = await page.getByRole('button', { name: /Entrar a la parrilla/i }).isVisible();
    console.log(name, JSON.stringify(scroll), 'startVisible', startVisible, 'errors', errors.length);
    await page.close();
  }
  // Mobile portrait
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await phone.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await phone.getByRole('button', { name: /Jugar ahora/i }).first().tap();
  await phone.waitForTimeout(400);
  await phone.screenshot({ path: '/tmp/fit-phone-pre.png' });
  await phone.getByRole('button', { name: /Entrar a la parrilla/i }).tap();
  await phone.waitForTimeout(3500);
  await phone.screenshot({ path: '/tmp/fit-phone-race.png' });
  const labelVisible = await phone.getByText('Gira el móvil para una vista más amplia').isVisible();
  console.log('portrait label', labelVisible);
  await phone.close();
  // AI pace
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:4173/?demo=1', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: /Jugar ahora/i }).first().click();
  await p.waitForTimeout(400);
  await p.getByRole('button', { name: /Entrar a la parrilla/i }).click();
  await p.waitForTimeout(42000);
  const t1 = await p.locator('.race-root').innerText();
  console.log('LAP-CHECK', (t1.match(/VUELTA\s*\n\s*(\d)/)||[])[1], (t1.match(/MEJOR VUELTA\s*\n?\s*([\d:.]+)/)||[])[1]);
  await p.waitForTimeout(80000);
  const t2 = await p.locator('.race-root').innerText();
  console.log('FINISH', t2.includes('CLASIFICACIÓN FINAL'), (t2.match(/TIEMPO TOTAL[\s\S]{0,40}/)||[])[0]);
  await p.screenshot({ path: '/tmp/fit-finish.png' });
  await p.close();
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
