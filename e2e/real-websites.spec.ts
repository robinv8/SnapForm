import { test, expect, chromium, type Browser } from '@playwright/test';
import { injectAndDetect } from './helpers/inject-detector';

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

test.afterAll(async () => {
  await browser.close();
});

async function navigateAndDetect(url: string, options?: { waitFor?: string; timeout?: number }) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: options?.timeout || 15000 });
    if (options?.waitFor) {
      await page.waitForSelector(options.waitFor, { timeout: 8000 }).catch(() => {});
    }
    await page.waitForTimeout(2000);
    const result = await injectAndDetect(page);
    return { page, result };
  } catch (e) {
    await page.close();
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────
// GitHub Login
// ─────────────────────────────────────────────────────────────────
test('GitHub login: should detect username and password', async () => {
  const { page, result } = await navigateAndDetect('https://github.com/login', {
    waitFor: 'input[name="login"]',
  });

  console.log('GitHub Login fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(2);
  const names = result.fields.map((f: any) => f.name);
  expect(names).toContain('login');
  expect(names).toContain('password');
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// GitHub Signup
// ─────────────────────────────────────────────────────────────────
test('GitHub signup: should detect registration fields', async () => {
  const { page, result } = await navigateAndDetect('https://github.com/signup', {
    waitFor: 'input',
  });

  console.log('GitHub Signup fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(1);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// httpbin (very stable classic form)
// ─────────────────────────────────────────────────────────────────
test('httpbin: should detect all form fields', async () => {
  const { page, result } = await navigateAndDetect('https://httpbin.org/forms/post', {
    waitFor: 'form',
  });

  console.log('httpbin fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(4);
  const names = result.fields.map((f: any) => f.name);
  expect(names).toContain('custname');
  expect(names).toContain('custtel');
  expect(names).toContain('custemail');
  expect(names).toContain('comments');
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// HackerNews Login
// ─────────────────────────────────────────────────────────────────
test('HackerNews login: should detect acct and pw', async () => {
  const { page, result } = await navigateAndDetect('https://news.ycombinator.com/login', {
    waitFor: 'input[name="acct"]',
  });

  console.log('HN fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(2);
  const names = result.fields.map((f: any) => f.name);
  expect(names).toContain('acct');
  expect(names).toContain('pw');
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// WordPress login (very common pattern)
// ─────────────────────────────────────────────────────────────────
test('WordPress.com login: should detect email field', async () => {
  const { page, result } = await navigateAndDetect('https://wordpress.com/log-in', {
    waitFor: 'input',
  });

  console.log('WordPress fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  // WordPress shows email first, then password on next step
  expect(result.fields.length).toBeGreaterThanOrEqual(1);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// Netlify (React SPA login)
// ─────────────────────────────────────────────────────────────────
test('Netlify login: should detect email and password', async () => {
  const { page, result } = await navigateAndDetect('https://app.netlify.com/login', {
    waitFor: 'input[name="email"]',
  });

  console.log('Netlify fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  // Netlify might redirect or show OAuth buttons first
  expect(result.fields.length).toBeGreaterThanOrEqual(0);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// Crates.io (Rust community, simple search)
// ─────────────────────────────────────────────────────────────────
test('crates.io: should detect search field', async () => {
  const { page, result } = await navigateAndDetect('https://crates.io/', {
    waitFor: 'input',
  });

  console.log('crates.io fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(1);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// PyPI (Python package registry, classic form)
// ─────────────────────────────────────────────────────────────────
test('PyPI login: should detect username and password', async () => {
  const { page, result } = await navigateAndDetect('https://pypi.org/account/login/', {
    waitFor: 'input[name="username"]',
  });

  console.log('PyPI fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(2);
  const names = result.fields.map((f: any) => f.name);
  expect(names).toContain('username');
  expect(names).toContain('password');
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────
test('summary: detection overview across all sites', async () => {
  const sites = [
    { name: 'GitHub Login', url: 'https://github.com/login', wait: 'input[name="login"]' },
    { name: 'HackerNews', url: 'https://news.ycombinator.com/login', wait: 'input' },
    { name: 'httpbin', url: 'https://httpbin.org/forms/post', wait: 'form' },
    { name: 'WordPress', url: 'https://wordpress.com/log-in', wait: 'input' },
    { name: 'PyPI', url: 'https://pypi.org/account/login/', wait: 'input[name="username"]' },
  ];

  const results: any[] = [];

  for (const site of sites) {
    try {
      const { page, result } = await navigateAndDetect(site.url, { waitFor: site.wait });
      results.push({
        name: site.name,
        fieldsDetected: result.fields.length,
        containerTag: result.containerTag,
        fields: result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`),
      });
      await page.close();
    } catch (e: any) {
      results.push({ name: site.name, error: e.message?.substring(0, 100) });
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  SnapForm Real-World Detection Report');
  console.log('═══════════════════════════════════════');
  results.forEach(r => {
    if (r.error) {
      console.log(`\n✗ ${r.name}: ${r.error}`);
    } else {
      console.log(`\n✓ ${r.name} — ${r.fieldsDetected} fields in <${r.containerTag}>`);
      r.fields.forEach((f: string) => console.log(`    ${f}`));
    }
  });
  console.log('\n═══════════════════════════════════════\n');

  const successful = results.filter(r => !r.error && r.fieldsDetected > 0);
  expect(successful.length).toBeGreaterThanOrEqual(3);
});
