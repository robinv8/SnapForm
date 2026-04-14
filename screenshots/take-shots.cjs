const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });

  const base = `file://${path.resolve(__dirname, 'mockup.html')}`;
  const scenes = [
    { hash: 'scene1', file: 'screenshot-1-fill-en.png' },
    { hash: 'scene2', file: 'screenshot-2-fill-zh.png' },
    { hash: 'scene3', file: 'screenshot-3-history.png' },
    { hash: 'scene4', file: 'screenshot-4-settings.png' },
  ];

  for (const { hash, file } of scenes) {
    await page.goto(`${base}#${hash}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.resolve(__dirname, file) });
    console.log('Saved', file);
  }

  await browser.close();
})();
