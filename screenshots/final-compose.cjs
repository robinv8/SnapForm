const { chromium } = require('playwright');
const path = require('path');

const scenes = [
  { bg: 'scene1', popup: 'popup-fill-en.png', out: 'screenshot-1-fill-en.png' },
  { bg: 'scene2', popup: 'popup-fill-zh.png', out: 'screenshot-2-fill-zh.png' },
  { bg: 'scene3', popup: 'popup-history.png', out: 'screenshot-3-history.png' },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  for (const { bg, popup, out } of scenes) {
    const url = `file://${path.resolve(__dirname, 'compose.html')}?bg=${bg}&popup=${popup}`;
    await page.goto(url);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.resolve(__dirname, out) });
    console.log('Saved', out);
  }

  await browser.close();
})();
