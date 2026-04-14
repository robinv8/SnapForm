const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:8765';

async function injectMockPopup(page, locale = 'en', state = 'fill-success') {
  await page.waitForTimeout(300);
  const isZh = locale === 'zh';
  const fillTab = isZh ? '填充' : 'Fill';
  const historyTab = isZh ? '历史' : 'History';
  const detected = isZh ? '<strong>&nbsp;5&nbsp;</strong> 个表单字段' : '<strong>6</strong>&nbsp;form fields detected';
  const aiBadge = '<div class="text-xs text-neutral-500 px-3 py-2 rounded-lg bg-neutral-100 flex items-center mb-3"><svg class="mr-2 shrink-0 text-neutral-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M7 15h0"/><path d="M17 15h0"/></svg><span class="truncate">Google Gemini / gemini-2.5-flash</span></div>';
  const btnFill = isZh ? '自动填充' : 'Filled 6 fields';
  const btnClear = isZh ? '清空表单' : 'Clear Form';
  const logLabel = isZh ? '操作日志' : 'Activity Log';
  const logs = isZh
    ? '<div class="flex items-start space-x-2"><div class="mt-0.5 shrink-0"><div class="w-3.5 h-3.5 rounded-full bg-success"></div></div><div><p class="text-neutral-700 leading-tight">检测到 5 个表单字段</p><span class="text-[10px] text-neutral-400">16:12:08</span></div></div>'
    : '<div class="flex items-start space-x-2"><div class="mt-0.5 shrink-0"><div class="w-3.5 h-3.5 rounded-full bg-success"></div></div><div><p class="text-neutral-700 leading-tight">Successfully filled 6 fields</p><span class="text-[10px] text-neutral-400">16:15:32</span></div></div><div class="flex items-start space-x-2"><div class="mt-0.5 shrink-0"><div class="w-3.5 h-3.5 rounded-full border-2 border-neutral-300"></div></div><div><p class="text-neutral-700 leading-tight">Generating data with local rules...</p><span class="text-[10px] text-neutral-400">16:15:31</span></div></div><div class="flex items-start space-x-2"><div class="mt-0.5 shrink-0"><div class="w-3.5 h-3.5 rounded-full bg-success"></div></div><div><p class="text-neutral-700 leading-tight">6 form fields detected</p><span class="text-[10px] text-neutral-400">16:15:30</span></div></div>';

  const btnClass = state === 'fill-success' ? 'bg-success' : 'bg-primary hover:bg-primary-hover active:scale-95';
  const btnIcon = state === 'fill-success'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';

  const customPromptHtml = `
    <div class="mb-3">
      <label class="block text-xs font-semibold text-neutral-500 tracking-wider mb-1.5">${isZh ? '生成提示词' : 'Generation Prompt'}</label>
      <textarea rows="2" class="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-primary resize-none" placeholder="${isZh ? '例如：生成电商用户注册信息；生成一份医疗预约表单数据...' : 'e.g. Generate e-commerce signup data; Generate medical appointment form data...'}"></textarea>
      <p class="mt-1 text-[10px] text-neutral-400">${isZh ? '填写后，AI 会参考你的要求生成更贴合场景的测试数据。不填则使用默认规则。' : 'When filled, AI will generate test data that better matches your scenario. Leave empty for default behavior.'}</p>
    </div>
  `;

  const html = `
<div class="w-[400px] max-h-[600px] flex flex-col bg-white overflow-hidden">
  <div class="bg-primary px-5 py-3.5 flex justify-between items-center text-white">
    <span class="font-semibold tracking-wide text-[15px]">SnapForm</span>
    <div class="flex items-center space-x-2">
      <button class="text-white/80 hover:text-white transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 12"/></svg></button>
      <button class="text-white/80 hover:text-white transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></button>
    </div>
  </div>
  <div class="flex border-b border-neutral-200 bg-white">
    <button class="flex-1 py-2.5 text-sm font-medium flex items-center justify-center space-x-1.5 transition-colors border-b-2 border-primary text-primary">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <span>${fillTab}</span>
    </button>
    <button class="flex-1 py-2.5 text-sm font-medium flex items-center justify-center space-x-1.5 transition-colors border-b-2 border-transparent text-neutral-500 hover:text-neutral-700">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>${historyTab}</span>
      ${isZh ? '' : '<span class="bg-neutral-200 text-neutral-600 text-[10px] px-1.5 py-0.5 rounded-full">3</span>'}
    </button>
  </div>
  <div class="p-4 flex-1 flex flex-col bg-neutral-50 overflow-y-auto">
    <div class="mb-3 p-3 rounded-lg bg-neutral-100 text-sm flex items-center text-neutral-700">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" class="mr-2 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span>${detected}</span>
    </div>
    ${aiBadge}
    ${customPromptHtml}
    <div class="space-y-2 mb-4">
      <button class="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center space-x-2 ${btnClass}">
        ${btnIcon}
        <span>${btnFill}</span>
      </button>
      <button class="w-full py-2.5 px-4 rounded-lg font-medium text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors text-sm flex items-center justify-center space-x-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
        <span>${btnClear}</span>
      </button>
    </div>
    <div class="flex-1 overflow-hidden flex flex-col min-h-0">
      <label class="text-xs font-semibold text-neutral-500 tracking-wider mb-2 block">${logLabel}</label>
      <div class="bg-white border border-neutral-200 rounded-lg flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        ${logs}
      </div>
    </div>
  </div>
</div>
  `;

  await page.evaluate((html) => {
    const root = document.getElementById('root');
    if (root) root.innerHTML = html;
  }, html);
  await page.waitForTimeout(200);
}

async function injectMockHistory(page) {
  await page.waitForTimeout(300);
  const html = `
<div class="w-[400px] max-h-[600px] flex flex-col bg-white overflow-hidden">
  <div class="bg-primary px-5 py-3.5 flex justify-between items-center text-white">
    <span class="font-semibold tracking-wide text-[15px]">SnapForm</span>
    <div class="flex items-center space-x-2">
      <button class="text-white/80 hover:text-white transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 12"/></svg></button>
      <button class="text-white/80 hover:text-white transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg></button>
    </div>
  </div>
  <div class="flex border-b border-neutral-200 bg-white">
    <button class="flex-1 py-2.5 text-sm font-medium flex items-center justify-center space-x-1.5 transition-colors border-b-2 border-transparent text-neutral-500 hover:text-neutral-700">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <span>Fill</span>
    </button>
    <button class="flex-1 py-2.5 text-sm font-medium flex items-center justify-center space-x-1.5 transition-colors border-b-2 border-primary text-primary">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>History</span>
      <span class="bg-neutral-200 text-neutral-600 text-[10px] px-1.5 py-0.5 rounded-full">3</span>
    </button>
  </div>
  <div class="flex-1 flex flex-col bg-neutral-50 overflow-hidden">
    <div class="p-3 pb-0 space-y-2">
      <div class="flex items-center space-x-2">
        <div class="flex-1 relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search domain, title or fields..." class="w-full pl-8 pr-8 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-primary">
        </div>
        <button class="shrink-0 p-2 text-neutral-400 hover:text-red-500 transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div>
    </div>
    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      <div class="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <button class="w-full px-3 py-2.5 flex items-center text-left hover:bg-neutral-50 transition-colors">
          <div class="shrink-0 mr-2.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-neutral-400"><polyline points="9 18 15 12 9 6"/></svg></div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-neutral-400"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              <span class="text-sm font-medium text-neutral-800 truncate">example.com</span>
              <span class="shrink-0 text-[10px] text-neutral-400">3m ago</span>
            </div>
            <p class="text-xs text-neutral-500 truncate mt-0.5">User Registration</p>
          </div>
          <div class="shrink-0 ml-2 flex items-center space-x-1.5">
            <span class="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">6 fields</span>
          </div>
        </button>
      </div>
      <div class="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <button class="w-full px-3 py-2.5 flex items-center text-left hover:bg-neutral-50 transition-colors">
          <div class="shrink-0 mr-2.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-neutral-400"><polyline points="9 18 15 12 9 6"/></svg></div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-neutral-400"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              <span class="text-sm font-medium text-neutral-800 truncate">ant.design</span>
              <span class="shrink-0 text-[10px] text-neutral-400">15m ago</span>
            </div>
            <p class="text-xs text-neutral-500 truncate mt-0.5">Ant Design Form 表单</p>
          </div>
          <div class="shrink-0 ml-2 flex items-center space-x-1.5">
            <span class="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">5 fields</span>
          </div>
        </button>
      </div>
      <div class="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <button class="w-full px-3 py-2.5 flex items-center text-left hover:bg-neutral-50 transition-colors">
          <div class="shrink-0 mr-2.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-neutral-400"><polyline points="9 18 15 12 9 6"/></svg></div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0 text-neutral-400"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              <span class="text-sm font-medium text-neutral-800 truncate">github.com</span>
              <span class="shrink-0 text-[10px] text-neutral-400">2h ago</span>
            </div>
            <p class="text-xs text-neutral-500 truncate mt-0.5">Create a new repository</p>
          </div>
          <div class="shrink-0 ml-2 flex items-center space-x-1.5">
            <span class="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">3 fields</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</div>
  `;
  await page.evaluate((html) => {
    const root = document.getElementById('root');
    if (root) root.innerHTML = html;
  }, html);
  await page.waitForTimeout(200);
}

async function injectMockSettings(page) {
  await page.waitForTimeout(300);
  const html = `
<div class="min-h-screen bg-neutral-50 py-6 px-4">
  <div class="max-w-2xl mx-auto space-y-5">
    <div class="rounded-xl shadow-lg p-5 text-white bg-gradient-to-r from-orange-500 to-orange-600">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-xl font-bold">Settings</h1>
          <p class="text-white/80 text-sm mt-0.5">Google Gemini / gemini-2.5-flash</p>
        </div>
        <div class="bg-white/20 backdrop-blur rounded-lg px-3 py-1 text-sm font-medium">AI Generation</div>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur px-2.5 py-1 rounded-md text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
          Connection successful
          <span class="text-white/80">· 432ms</span>
        </span>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
      <div class="p-5 space-y-5">
        <section>
          <h2 class="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6F3C" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M7 15h0"/><path d="M17 15h0"/></svg>
            AI Configuration
          </h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-neutral-700 mb-1.5">AI Provider</label>
              <div class="w-full px-3 py-2.5 border border-neutral-300 rounded-lg bg-white text-left flex items-center justify-between">
                <div class="flex flex-col">
                  <span class="font-medium">Google Gemini</span>
                  <span class="text-[11px] text-neutral-400">https://generativelanguage.googleapis.com/v1beta/openai</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-neutral-400 shrink-0 ml-2"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-neutral-700 mb-1.5">API Key</label>
              <div class="relative">
                <input type="password" value="sk-xxxxxxxxxxxx" class="w-full px-3 py-2.5 pr-24 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-primary outline-none transition-all" />
                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button class="p-1 text-neutral-400 hover:text-neutral-600 rounded-md hover:bg-neutral-100"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                  <button class="p-1 text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-100"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                  <button class="p-1 text-neutral-400 hover:text-neutral-600 rounded-md hover:bg-neutral-100"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>
                </div>
              </div>
              <p class="mt-1.5 text-sm text-neutral-500"><a href="#" class="text-primary hover:underline inline-flex items-center gap-1">Get API Key <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a></p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-neutral-700 mb-1.5">Model</label>
              <div class="w-full px-3 py-2.5 border border-neutral-300 rounded-lg bg-white text-left flex items-center justify-between">
                <span class="font-medium">gemini-2.5-flash</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-neutral-400 shrink-0 ml-2"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
        </section>

        <hr class="border-neutral-100" />

        <section>
          <h2 class="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6F3C" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Preferences
          </h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-neutral-700 mb-2">Default Fill Mode</label>
              <div class="grid grid-cols-2 gap-2">
                <div class="px-3 py-2.5 rounded-lg border-2 border-primary bg-orange-50 text-primary text-left">
                  <div class="font-medium text-sm">AI Generation (Recommended)</div>
                  <div class="text-[11px] text-neutral-400 mt-0.5">Use AI to analyze forms and generate smart data</div>
                </div>
                <div class="px-3 py-2.5 rounded-lg border-2 border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 text-left">
                  <div class="font-medium text-sm">Local Generation</div>
                  <div class="text-[11px] text-neutral-400 mt-0.5">Use built-in rules, no API needed</div>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-neutral-700 mb-2">Show in-page quick fill button</label>
              <div class="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 bg-white">
                <div class="text-sm text-neutral-600">Show one-click fill icon when forms are detected</div>
                <button class="relative inline-flex h-6 w-11 items-center rounded-full bg-primary"><span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6"></span></button>
              </div>
            </div>
          </div>
        </section>

        <hr class="border-neutral-100" />

        <section>
          <h2 class="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6F3C" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            About
          </h2>
          <div class="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-sm text-neutral-700 space-y-1">
            <p><span class="font-semibold">About AI Fill mode:</span> uses your chosen LLM to analyze forms and generate smart test data. Your API key is stored securely in the browser and synced across your devices via Chrome Sync.</p>
            <p>Standard mode requires no API Key and uses built-in heuristic rules to generate data.</p>
          </div>
        </section>

        <div class="flex items-center gap-3 pt-1">
          <button class="flex items-center space-x-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>Save Settings</span>
          </button>
          <button class="flex items-center space-x-2 px-5 py-2.5 border-2 border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:border-neutral-400 transition-colors">
            <span>Test Connection</span>
          </button>
          <div class="flex items-center space-x-2 text-green-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            <span class="text-sm font-medium">Saved</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  `;
  await page.evaluate((html) => {
    const root = document.getElementById('root');
    if (root) root.innerHTML = html;
  }, html);
  await page.waitForTimeout(200);
}

async function capturePopup(page, locale, state) {
  await page.goto(`${BASE}/src/popup/popup.html`);
  if (state === 'history') {
    await injectMockHistory(page);
  } else {
    await injectMockPopup(page, locale, state);
  }
  await page.waitForTimeout(200);
  const box = await page.locator('#root > div').first().boundingBox();
  if (!box) throw new Error('Popup not found');
  return await page.screenshot({ clip: box });
}

async function captureBackground(page, lang) {
  const url = `file://${path.resolve(__dirname, 'test-form.html')}?lang=${lang}`;
  await page.goto(url);
  await page.waitForTimeout(400);
  return await page.screenshot();
}

async function composite(page, bgBuffer, popupBuffer, outPath) {
  const base64Bg = bgBuffer.toString('base64');
  const base64Popup = popupBuffer.toString('base64');

  const dataUrl = await page.evaluate(({ base64Bg, base64Popup }) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');

      const bgImg = new Image();
      bgImg.onload = () => {
        ctx.drawImage(bgImg, 0, 0);
        const popupImg = new Image();
        popupImg.onload = () => {
          const x = 1280 - 24 - popupImg.width;
          const y = 8;
          ctx.drawImage(popupImg, x, y);
          resolve(canvas.toDataURL('image/png'));
        };
        popupImg.src = 'data:image/png;base64,' + base64Popup;
      };
      bgImg.src = 'data:image/png;base64,' + base64Bg;
    });
  }, { base64Bg, base64Popup });

  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // 1. English fill
  const bgEn = await captureBackground(page, 'en');
  fs.writeFileSync(path.resolve(__dirname, 'bg-en.png'), bgEn);
  const popupEn = await capturePopup(page, 'en', 'fill-success');
  fs.writeFileSync(path.resolve(__dirname, 'popup-fill-en.png'), popupEn);
  await composite(page, bgEn, popupEn, path.resolve(__dirname, 'screenshot-1-fill-en.png'));
  console.log('Saved screenshot-1-fill-en.png');

  // 2. Chinese fill
  const bgZh = await captureBackground(page, 'zh');
  fs.writeFileSync(path.resolve(__dirname, 'bg-zh.png'), bgZh);
  const popupZh = await capturePopup(page, 'zh', 'fill-idle');
  fs.writeFileSync(path.resolve(__dirname, 'popup-fill-zh.png'), popupZh);
  await composite(page, bgZh, popupZh, path.resolve(__dirname, 'screenshot-2-fill-zh.png'));
  console.log('Saved screenshot-2-fill-zh.png');

  // 3. History - reuse english background
  const popupHist = await capturePopup(page, 'en', 'history');
  fs.writeFileSync(path.resolve(__dirname, 'popup-history.png'), popupHist);
  await composite(page, bgEn, popupHist, path.resolve(__dirname, 'screenshot-3-history.png'));
  console.log('Saved screenshot-3-history.png');

  // 4. Settings
  await page.goto(`${BASE}/src/options/options.html`);
  await injectMockSettings(page);
  const settingsBuf = await page.screenshot();
  fs.writeFileSync(path.resolve(__dirname, 'screenshot-4-settings.png'), settingsBuf);
  console.log('Saved screenshot-4-settings.png');

  await browser.close();
})();
