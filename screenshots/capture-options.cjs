const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(`file://${path.resolve(__dirname, 'options-mock.html')}`);
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.resolve(__dirname, 'screenshot-4-settings.png') });
  console.log('Saved screenshot-4-settings.png');

  await browser.close();
})();
