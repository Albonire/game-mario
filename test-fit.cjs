const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  for (const [name, w, h] of [['laptop', 1280, 720], ['small', 1024, 640], ['desktop', 1440, 900]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Jugar ahora/i }).first().click();
    await page.waitForTimeout(450);
    await page.screenshot({ path: `/tmp/fit2-${name}.png` });
    const scroll = await page.evaluate(() => {
      const el = document.querySelector('div.overflow-y-auto');
      return el ? { sh: el.scrollHeight, ch: el.clientHeight } : null;
    });
    console.log(name, JSON.stringify(scroll));
    await page.close();
  }
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await phone.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await phone.getByRole('button', { name: /Jugar ahora/i }).first().tap();
  await phone.waitForTimeout(350);
  await phone.getByRole('button', { name: /Entrar a la parrilla/i }).tap();
  await phone.waitForTimeout(9000);
  await phone.screenshot({ path: '/tmp/fit2-phone-race.png' });
  await phone.close();
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
