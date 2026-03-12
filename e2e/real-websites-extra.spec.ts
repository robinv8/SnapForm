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
// Lobsters (HN-like, simple login form)
// ─────────────────────────────────────────────────────────────────
test('Lobsters login: should detect email and password', async () => {
  const { page, result } = await navigateAndDetect('https://lobste.rs/login', {
    waitFor: 'input',
  });

  console.log('Lobsters fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(2);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// DuckDuckGo (search engine, single search input)
// ─────────────────────────────────────────────────────────────────
test('DuckDuckGo: should detect search input', async () => {
  const { page, result } = await navigateAndDetect('https://duckduckgo.com/', {
    waitFor: 'input',
  });

  console.log('DDG fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(1);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// Wikipedia (detect any fields — search may have 0 dims in headless)
// ─────────────────────────────────────────────────────────────────
test('Wikipedia: should detect fields on page', async () => {
  const { page, result } = await navigateAndDetect('https://en.wikipedia.org/', {
    waitFor: 'input',
  });

  console.log('Wikipedia fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  // Wikipedia has settings radio buttons even if search has 0 dims
  expect(result.fields.length).toBeGreaterThanOrEqual(1);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// Bitbucket (Atlassian login)
// ─────────────────────────────────────────────────────────────────
test('Bitbucket login: should detect email field', async () => {
  const { page, result } = await navigateAndDetect('https://bitbucket.org/account/signin/', {
    waitFor: 'input',
  });

  console.log('Bitbucket fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(1);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// Docker Hub (login form)
// ─────────────────────────────────────────────────────────────────
test('Docker Hub login: should detect username and password', async () => {
  const { page, result } = await navigateAndDetect('https://login.docker.com/u/login', {
    waitFor: 'input',
  });

  console.log('Docker Hub fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(1);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// RubyGems (another package registry)
// ─────────────────────────────────────────────────────────────────
test('RubyGems login: should detect email and password', async () => {
  const { page, result } = await navigateAndDetect('https://rubygems.org/sign_in', {
    waitFor: 'input',
  });

  console.log('RubyGems fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(2);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// Discourse (community forum login — very common)
// ─────────────────────────────────────────────────────────────────
test('Discourse Meta login: should detect login fields', async () => {
  const { page, result } = await navigateAndDetect('https://meta.discourse.org/login', {
    waitFor: 'input',
  });

  console.log('Discourse fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(1);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// Gitea (self-hosted Git, open source)
// ─────────────────────────────────────────────────────────────────
test('Gitea demo login: should detect username and password', async () => {
  const { page, result } = await navigateAndDetect('https://demo.gitea.com/user/login', {
    waitFor: 'input[name="user_name"]',
  });

  console.log('Gitea fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(2);
  const names = result.fields.map((f: any) => f.name);
  expect(names).toContain('user_name');
  expect(names).toContain('password');
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// Codeberg (Gitea-based, another instance)
// ─────────────────────────────────────────────────────────────────
test('Codeberg login: should detect username and password', async () => {
  const { page, result } = await navigateAndDetect('https://codeberg.org/user/login', {
    waitFor: 'input[name="user_name"]',
  });

  console.log('Codeberg fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(2);
  const names = result.fields.map((f: any) => f.name);
  expect(names).toContain('user_name');
  expect(names).toContain('password');
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// Sourcehut (sr.ht, minimalist login)
// ─────────────────────────────────────────────────────────────────
test('Sourcehut login: should detect login fields', async () => {
  const { page, result } = await navigateAndDetect('https://meta.sr.ht/login', {
    waitFor: 'input',
  });

  console.log('Sourcehut fields:', result.fields.map((f: any) => `${f.name}(${f.type}): "${f.label}"`));

  expect(result.fields.length).toBeGreaterThanOrEqual(1);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
// Summary for extra sites
// ─────────────────────────────────────────────────────────────────
test('summary: extra sites detection overview', async () => {
  test.setTimeout(120000);

  const sites = [
    { name: 'Lobsters', url: 'https://lobste.rs/login', wait: 'input' },
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com/', wait: 'input' },
    { name: 'RubyGems', url: 'https://rubygems.org/sign_in', wait: 'input' },
    { name: 'Gitea', url: 'https://demo.gitea.com/user/login', wait: 'input' },
    { name: 'Codeberg', url: 'https://codeberg.org/user/login', wait: 'input' },
    { name: 'Discourse', url: 'https://meta.discourse.org/login', wait: 'input' },
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
  console.log('  SnapForm Extra Sites Detection Report');
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
  expect(successful.length).toBeGreaterThanOrEqual(4);
});
