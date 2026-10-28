const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const shots = [
    ['pilotos', '#pilotos'],
    ['circuito', '#circuito'],
    ['juego', '#juego'],
    ['logros', '#logros'],
    ['como-jugar', '#como-jugar'],
  ];
  for (const [name, sel] of shots) {
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `/tmp/section-${name}.png` });
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(700);
  await page.screenshot({ path: '/tmp/section-footer.png' });
  // achievement toast / count handling
  await page.evaluate(() => localStorage.setItem('tux-racing-achievements-v1', JSON.stringify(['champion'])));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#logros').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/section-logros-unlocked.png' });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
