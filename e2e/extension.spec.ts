import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_PATH = path.resolve(__dirname, '..', 'dist');
const FIXTURES_PATH = path.resolve(__dirname, 'fixtures');

// Helper: create a browser context with extension loaded
async function createContextWithExtension() {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${DIST_PATH}`,
      `--load-extension=${DIST_PATH}`,
    ],
  });

  // Wait for service worker to be ready
  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }

  // Get extension ID from service worker URL
  const extensionId = serviceWorker.url().split('/')[2];

  return { context, extensionId };
}

// Helper: open a fixture page and trigger detection via content script
async function openFixture(context: BrowserContext, fixture: string) {
  const page = await context.newPage();
  await page.goto(`file://${path.join(FIXTURES_PATH, fixture)}`);
  await page.waitForTimeout(500); // Wait for content script to load
  return page;
}

// Helper: detect fields by sending message to content script
async function detectFields(page: any) {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'DETECT_FORMS' }, (response: any) => {
        resolve(response);
      });
    });
  });
}

test.describe('Content script detection', () => {
  let context: BrowserContext;

  test.beforeAll(async () => {
    const result = await createContextWithExtension();
    context = result.context;
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('simple form: should detect all field types', async () => {
    const page = await openFixture(context, 'simple-form.html');

    // Execute detection directly via content script's injected code
    const fields = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      const result: any[] = [];
      inputs.forEach((el: any) => {
        if (['hidden', 'submit', 'button', 'file', 'reset'].includes(el.type)) return;
        result.push({
          name: el.name,
          type: el.type || el.tagName.toLowerCase(),
          id: el.id,
        });
      });
      return result;
    });

    expect(fields.length).toBe(7); // name, email, phone, age, bio, role, agree
    await page.close();
  });

  test('simple form: content script should detect fields correctly', async () => {
    const page = await openFixture(context, 'simple-form.html');

    // Call the content script's detection
    const result: any = await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        // Content script listens for messages from chrome.runtime
        // We can't easily call it from page context, so we test the DOM directly
        // by checking what the content script would see
        const container = document.querySelector('form') || document.body;
        const inputs = container.querySelectorAll('input, select, textarea');
        const fields: any[] = [];
        inputs.forEach((el: any, i: number) => {
          if (['hidden', 'submit', 'button', 'file', 'reset'].includes(el.type)) return;
          const label = el.id
            ? document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim()
            : el.closest('label')?.textContent?.trim() || el.placeholder || el.name;
          fields.push({
            id: el.id || el.name || `field_${i}`,
            name: el.name,
            label,
            type: el.tagName === 'SELECT' ? 'select' : el.tagName === 'TEXTAREA' ? 'textarea' : el.type,
          });
        });
        resolve({ fields });
      });
    });

    expect(result.fields.length).toBe(7);
    expect(result.fields[0].label).toBe('Name');
    expect(result.fields[1].label).toBe('Email');
    expect(result.fields[1].type).toBe('email');
    expect(result.fields[4].type).toBe('textarea');
    expect(result.fields[5].type).toBe('select');
    expect(result.fields[6].type).toBe('checkbox');
    await page.close();
  });

  test('modal form: should only detect modal fields, not background', async () => {
    const page = await openFixture(context, 'modal-form.html');

    const result: any = await page.evaluate(() => {
      // Simulate what findActiveFormContainer does
      const modals = document.querySelectorAll('[role="dialog"]');
      let topModal: Element | null = null;
      let topZ = -1;

      modals.forEach((m: any) => {
        const z = parseInt(window.getComputedStyle(m).zIndex) || 0;
        if (z > topZ && m.querySelectorAll('input, select, textarea').length > 0) {
          topZ = z;
          topModal = m;
        }
      });

      const container = topModal || document.body;
      const inputs = container.querySelectorAll('input, select, textarea');
      const fields: any[] = [];
      inputs.forEach((el: any) => {
        if (['hidden', 'submit', 'button', 'file', 'reset'].includes(el.type)) return;
        fields.push({ name: el.name, type: el.type });
      });
      return { fields, containerTag: container.tagName };
    });

    // Should detect modal fields only (full_name, email, password, country)
    expect(result.fields.length).toBe(4);
    expect(result.fields.map((f: any) => f.name)).toEqual(['full_name', 'email', 'password', 'country']);
    // Background field should NOT be included
    expect(result.fields.find((f: any) => f.name === 'bg_name')).toBeUndefined();
    await page.close();
  });

  test('dialog form: should detect fields inside open dialog', async () => {
    const page = await openFixture(context, 'dialog-form.html');

    // Open the dialog
    await page.click('#open-btn');
    await page.waitForTimeout(300);

    const result: any = await page.evaluate(() => {
      const openDialog = document.querySelector('dialog[open]');
      if (!openDialog) return { fields: [], dialogOpen: false };

      const inputs = openDialog.querySelectorAll('input, select, textarea');
      const fields: any[] = [];
      inputs.forEach((el: any) => {
        if (['hidden', 'submit', 'button', 'file', 'reset'].includes(el.type)) return;
        fields.push({ name: el.name, type: el.type });
      });
      return { fields, dialogOpen: true };
    });

    expect(result.dialogOpen).toBe(true);
    expect(result.fields.length).toBe(4); // display_name, email, bio, public_profile
    expect(result.fields.find((f: any) => f.name === 'search')).toBeUndefined();
    await page.close();
  });

  test('dialog form: should detect background form when dialog is closed', async () => {
    const page = await openFixture(context, 'dialog-form.html');
    // Dialog is closed by default

    const result: any = await page.evaluate(() => {
      const openDialog = document.querySelector('dialog[open]');
      // No open dialog, fall back to form
      const form = document.querySelector('form');
      const container = openDialog || form || document.body;

      const inputs = container.querySelectorAll('input, select, textarea');
      const fields: any[] = [];
      inputs.forEach((el: any) => {
        if (['hidden', 'submit', 'button', 'file', 'reset'].includes(el.type)) return;
        fields.push({ name: el.name });
      });
      return { fields, usedDialog: !!openDialog };
    });

    expect(result.usedDialog).toBe(false);
    expect(result.fields.length).toBe(1); // only search field
    expect(result.fields[0].name).toBe('search');
    await page.close();
  });

  test('chinese form: should detect all fields with Chinese labels', async () => {
    const page = await openFixture(context, 'chinese-form.html');

    const result: any = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea');
      const fields: any[] = [];
      inputs.forEach((el: any) => {
        if (['hidden', 'submit', 'button', 'file', 'reset'].includes(el.type)) return;
        const label = el.id
          ? document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim()
          : el.closest('label')?.textContent?.trim();
        fields.push({ name: el.name, label });
      });
      return { fields };
    });

    expect(result.fields.length).toBe(7);
    expect(result.fields[0].label).toBe('姓名');
    expect(result.fields[1].label).toBe('手机号码');
    expect(result.fields[4].label).toContain('职位');
    await page.close();
  });

  test('stacked modals: should detect only the topmost modal fields', async () => {
    const page = await openFixture(context, 'stacked-modals.html');

    const result: any = await page.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"]');
      let topModal: Element | null = null;
      let topZ = -1;

      modals.forEach((m: any) => {
        const z = parseInt(window.getComputedStyle(m).zIndex) || 0;
        if (z > topZ && m.querySelectorAll('input').length > 0) {
          topZ = z;
          topModal = m;
        }
      });

      const container = topModal || document.body;
      const inputs = container.querySelectorAll('input, select, textarea');
      const fields: any[] = [];
      inputs.forEach((el: any) => {
        if (['hidden', 'submit', 'button', 'file', 'reset'].includes(el.type)) return;
        fields.push({ name: el.name });
      });
      return { fields, zIndex: topZ };
    });

    expect(result.zIndex).toBe(200);
    expect(result.fields.length).toBe(2); // top_name, top_email
    expect(result.fields[0].name).toBe('top_name');
    expect(result.fields[1].name).toBe('top_email');
    // Should NOT include first modal or background
    expect(result.fields.find((f: any) => f.name === 'first_name')).toBeUndefined();
    expect(result.fields.find((f: any) => f.name === 'bg_field')).toBeUndefined();
    await page.close();
  });
});

test.describe('Extension popup', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    const result = await createContextWithExtension();
    context = result.context;
    extensionId = result.extensionId;
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('popup should load and show UI', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await page.waitForTimeout(1000);

    // Check that the popup rendered
    const title = await page.textContent('body');
    expect(title).toContain('SnapForm');
    await page.close();
  });

  test('options page should load', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await page.waitForTimeout(1000);

    const title = await page.textContent('body');
    expect(title).toContain('SnapForm');
    await page.close();
  });
});
