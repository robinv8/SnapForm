const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const scenes = [
  { id: 'scene1', popup: 'popup-fill-en.png', out: 'screenshot-1-fill-en.png' },
  { id: 'scene2', popup: 'popup-fill-zh.png', out: 'screenshot-2-fill-zh.png' },
  { id: 'scene3', popup: 'popup-history.png', out: 'screenshot-3-history.png' },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const baseHtml = `file://${path.resolve(__dirname, 'mockup.html')}`;

  for (const { id, popup, out } of scenes) {
    await page.goto(`${baseHtml}#${id}`);
    await page.waitForTimeout(400);

    const popupPath = path.resolve(__dirname, popup);
    const popupBuffer = fs.readFileSync(popupPath);
    const popupBase64 = popupBuffer.toString('base64');

    // Find the popup container in the active scene
    const box = await page.locator(`#${id} .popup-container`).first().boundingBox();
    if (!box) {
      console.warn('No popup container found for', id);
      continue;
    }

    // Composite by drawing the real popup image over the mockup at the exact position
    await page.evaluate(({ box, popupBase64 }) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 1280;
          canvas.height = 800;
          const ctx = canvas.getContext('2d');

          // Draw the existing page content
          const existingCanvases = document.querySelectorAll('canvas[data-temp]');
          existingCanvases.forEach(c => c.remove());

          html2canvas = null; // not available, use different approach
          resolve();
        };
        img.src = 'data:image/png;base64,' + popupBase64;
      });
    }, { box, popupBase64 });

    // Simpler approach: replace the mockup popup HTML with an img tag pointing to the real screenshot
    await page.evaluate(({ box, popupBase64 }) => {
      const container = document.querySelector('.popup-container');
      if (!container) return;
      container.innerHTML = '';
      container.style.width = box.width + 'px';
      container.style.height = box.height + 'px';
      container.style.overflow = 'hidden';
      const img = document.createElement('img');
      img.src = 'data:image/png;base64,' + popupBase64;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.display = 'block';
      container.appendChild(img);
    }, { box, popupBase64 });

    await page.waitForTimeout(200);
    await page.screenshot({ path: path.resolve(__dirname, out) });
    console.log('Saved', out);
  }

  await browser.close();
})();
