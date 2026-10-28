const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Jugar ahora/i }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/prerace2.png' });
  const preraceScroll = await page.evaluate(() => {
    const el = document.querySelector('.race-root > div, .fixed.inset-0');
    return { scrollH: document.documentElement.scrollHeight, win: window.innerHeight };
  });
  console.log('PRERACE', JSON.stringify(preraceScroll));
  await page.getByRole('button', { name: /Entrar a la parrilla/i }).click();
  await page.waitForTimeout(3200);
  await page.screenshot({ path: '/tmp/race-new.png' });
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(4000);
  const hud1 = await page.locator('.race-root').innerText();
  console.log('HUD START', hud1.replace(/\n/g, ' | ').slice(0, 320));
  await page.keyboard.up('ArrowUp');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/pause.png' });
  const pauseVisible = await page.getByText('Carrera en pausa').isVisible();
  console.log('PAUSE', pauseVisible);
  await page.getByRole('button', { name: /Continuar carrera/i }).click();
  await page.waitForTimeout(200);
  console.log('ERRORS-FIRST', errors.length ? errors.join('\n') : 'none');
  await browser.close();

  // Demo full race
  const b2 = await chromium.launch();
  const p2 = await b2.newPage({ viewport: { width: 1440, height: 900 } });
  const err2 = [];
  p2.on('console', (m) => { if (m.type() === 'error') err2.push(m.text()); });
  p2.on('pageerror', (e) => err2.push('PAGEERROR ' + e.message));
  await p2.goto('http://127.0.0.1:4173/?demo=1', { waitUntil: 'networkidle' });
  await p2.waitForTimeout(500);
  await p2.getByRole('button', { name: /Jugar ahora/i }).first().click();
  await p2.waitForTimeout(400);
  await p2.getByRole('button', { name: /Entrar a la parrilla/i }).click();
  const samples = [];
  for (let i = 0; i < 20; i++) {
    await p2.waitForTimeout(9000);
    const finished = await p2.getByText('Clasificación final').isVisible().catch(() => false);
    const text = await p2.locator('.race-root').innerText();
    const lap = (text.match(/VUELTA\s*\n?\s*(\d)/i) || [])[1];
    const speed = (text.match(/(\d{1,3})\s*\n?\s*KM\/H/i) || [])[1];
    const pos = (text.match(/P(\d)/) || [])[1];
    samples.push({ t: (i + 1) * 9, lap, speed, pos, finished });
    console.log('SAMPLE', JSON.stringify(samples[samples.length - 1]));
    if (i === 4) await p2.screenshot({ path: '/tmp/demo-mid.png' });
    if (finished) break;
  }
  await p2.waitForTimeout(1000);
  await p2.screenshot({ path: '/tmp/demo-end.png' });
  const resultText = await p2.locator('.race-root').innerText();
  console.log('RESULT VISIBLE', resultText.includes('Clasificación final'));
  console.log('RESULT SAMPLE', resultText.replace(/\n/g, ' | ').slice(0, 700));
  console.log('DEMO ERRORS', err2.length ? err2.join('\n') : 'none');
  await b2.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
