// Content script - runs on web pages to detect and fill forms

import { FormFieldDefinition, FormData, SnapFormSettings } from '../types';
import { findActiveFormContainer, detectFields, detectFormFields, isElementVisible } from '../detector/formDetector';

// Guard against double-execution when re-injected
if ((globalThis as typeof globalThis & { __SNAPFORM_CONTENT_LOADED__?: boolean }).__SNAPFORM_CONTENT_LOADED__) {
  console.log('[SnapForm] Content script already loaded, skipping re-initialization.');
} else {
  (globalThis as typeof globalThis & { __SNAPFORM_CONTENT_LOADED__?: boolean }).__SNAPFORM_CONTENT_LOADED__ = true;
  main();
}

function main() {
// Message types for communication with popup
interface DetectFormsMessage {
  type: 'DETECT_FORMS';
}

interface GetFormHtmlMessage {
  type: 'GET_FORM_HTML';
}

interface FillFormMessage {
  type: 'FILL_FORM';
  data: FormData;
}

interface SetFieldsMessage {
  type: 'SET_DETECTED_FIELDS';
  fields: FormFieldDefinition[];
}

type Message = DetectFormsMessage | GetFormHtmlMessage | FillFormMessage | SetFieldsMessage;

// Store detected fields for filling
let detectedFields: FormFieldDefinition[] = [];

// Get relevant form HTML from the active container
function getFormHtml(): string {
  const container = findActiveFormContainer(document);
  return container.outerHTML.substring(0, 50000); // Limit to ~50KB
}

// Fill form fields with data — scoped to active container
async function fillFormFields(data: FormData): Promise<void> {
  console.log('[SnapForm] fillFormFields called with data keys:', Object.keys(data));
  const container = findActiveFormContainer(document);
  const inputs = container.querySelectorAll('input, select, textarea');
  const inputsArray = Array.from(inputs) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];
  console.log('[SnapForm] Found inputs in container:', inputsArray.length);

  injectHighlightStyle();
  container.classList.add(FORM_HIGHLIGHT_CLASS);
  const totalDuration = Object.keys(data).length * 200 + 1500;
  setTimeout(() => {
    container.classList.remove(FORM_HIGHLIGHT_CLASS);
  }, totalDuration);

  const entries = Object.entries(data);
  for (let i = 0; i < entries.length; i++) {
    const [fieldId, value] = entries[i];

    // Try to find input by id, name
    let input = inputsArray.find(i => i.id === fieldId || i.name === fieldId);

    // For generated IDs like "field_0", find by index among visible inputs
    if (!input && fieldId.startsWith('field_')) {
      const match = fieldId.match(/^field_(\d+)(?:_(\d+))?$/);
      if (match) {
        const visibleInputs = inputsArray.filter(i => {
          const skipTypes = ['hidden', 'submit', 'button', 'image', 'file', 'reset'];
          return !skipTypes.includes(i.type) && isElementVisible(i);
        });
        const index = parseInt(match[1]);
        if (index < visibleInputs.length) {
          input = visibleInputs[index];
        }
      }
    }

    if (!input) {
      console.warn('[SnapForm] No input found for field:', fieldId);
      continue;
    }

    // Highlight the field before filling
    input.classList.add(HIGHLIGHT_CLASS);
    input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Small delay before filling to let the highlight register
    await new Promise(r => setTimeout(r, 120));

    // Fill based on type
    if (input.tagName === 'SELECT') {
      (input as HTMLSelectElement).value = String(value);
    } else if ((input as HTMLInputElement).type === 'checkbox') {
      (input as HTMLInputElement).checked = Boolean(value);
    } else {
      (input as HTMLInputElement).value = String(value);
    }

    triggerInputEvents(input);
    console.log('[SnapForm] Filled field:', fieldId, 'with value:', value);

    // Delay between fields for a "typing" rhythm
    if (i < entries.length - 1) {
      await new Promise(r => setTimeout(r, 80));
    }

    // Remove highlight after a short moment
    setTimeout(() => {
      input!.classList.remove(HIGHLIGHT_CLASS);
    }, 600);
  }
}

// Trigger events for React/Vue/Angular compatibility
function triggerInputEvents(input: HTMLElement): void {
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));

  // For React controlled components
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set;

  if (nativeInputValueSetter && input.tagName === 'INPUT') {
    const currentValue = (input as HTMLInputElement).value;
    nativeInputValueSetter.call(input, currentValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set;

  if (nativeTextareaValueSetter && input.tagName === 'TEXTAREA') {
    const currentValue = (input as HTMLTextAreaElement).value;
    nativeTextareaValueSetter.call(input, currentValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// ─── Highlight detected fields ──────────────────────────────────

const HIGHLIGHT_CLASS = 'snapform-highlight';
const FORM_HIGHLIGHT_CLASS = 'snapform-form-highlight';
let styleInjected = false;

function injectHighlightStyle(): void {
  if (styleInjected) return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes snapform-pulse {
      0%, 100% { outline-color: rgba(234, 88, 12, 0); }
      25%, 75% { outline-color: rgba(234, 88, 12, 0.8); }
      50% { outline-color: rgba(234, 88, 12, 0.4); }
    }
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid rgba(234, 88, 12, 0.8) !important;
      outline-offset: 2px !important;
      animation: snapform-pulse 1.5s ease-in-out;
    }
    .${FORM_HIGHLIGHT_CLASS} {
      outline: 2px dashed rgba(234, 88, 12, 0.6) !important;
      outline-offset: 4px !important;
      transition: outline 0.3s ease;
    }
  `;
  document.head.appendChild(style);
  styleInjected = true;
}

const CUSTOM_SELECTORS = '.ant-select, .ant-picker, .ant-cascader, .ant-input-number, .ant-switch, .ant-rate, .ant-slider, .el-select, .el-date-editor, .el-cascader, .el-input-number, .el-switch';

function findHighlightTarget(field: FormFieldDefinition, container: Element): HTMLElement | null {
  const inputs = Array.from(
    container.querySelectorAll('input, select, textarea')
  ) as HTMLElement[];
  const skipTypes = ['hidden', 'submit', 'button', 'image', 'file', 'reset'];

  let el = inputs.find(i =>
    (i as HTMLInputElement).id === field.id || (i as HTMLInputElement).name === field.id
  );

  if (!el) {
    try {
      const custom = container.querySelector(`#${CSS.escape(field.id)}`) as HTMLElement;
      if (custom?.matches(CUSTOM_SELECTORS)) el = custom;
    } catch {
      // Invalid selector
    }
  }

  if (!el && field.id.startsWith('field_')) {
    const m = field.id.match(/^field_(\d+)/);
    if (m) {
      const idx = parseInt(m[1]);
      const allVisible: HTMLElement[] = [];
      inputs.forEach(i => {
        if (!skipTypes.includes((i as HTMLInputElement).type) && isElementVisible(i)) {
          allVisible.push(i);
        }
      });
      container.querySelectorAll(CUSTOM_SELECTORS).forEach(c => {
        if (isElementVisible(c as HTMLElement)) allVisible.push(c as HTMLElement);
      });
      if (idx < allVisible.length) el = allVisible[idx];
    }
  }

  if (el) {
    const formItem = el.closest('.ant-form-item, .el-form-item');
    if (formItem) return formItem as HTMLElement;
  }

  return el || null;
}

function highlightFields(fields: FormFieldDefinition[]): void {
  injectHighlightStyle();

  const container = findActiveFormContainer(document);
  const matched = new Set<HTMLElement>();

  fields.forEach(field => {
    const el = findHighlightTarget(field, container);
    if (el) matched.add(el);
  });

  matched.forEach(el => el.classList.add(HIGHLIGHT_CLASS));

  setTimeout(() => {
    matched.forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
  }, 1600);
}

// ─── Message Listener ───────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  switch (message.type) {
    case 'DETECT_FORMS': {
      const container = findActiveFormContainer(document);
      const fields = detectFields(container);
      if (fields.length > 0) highlightFields(fields);
      sendResponse({ fields });
      break;
    }

    case 'GET_FORM_HTML': {
      const html = getFormHtml();
      sendResponse({ html });
      break;
    }

    case 'FILL_FORM':
      (async () => {
        await fillFormFields(message.data);
        sendResponse({ success: true });
      })();
      break;

    case 'SET_DETECTED_FIELDS':
      detectedFields = message.fields;
      if (detectedFields.length > 0) highlightFields(detectedFields);
      sendResponse({ success: true });
      break;
  }

  return true;
});

// ─── Floating Button ────────────────────────────────────────────

const FLOATING_BTN_ID = 'snapform-floating-btn-host';
let floatingHost: HTMLElement | null = null;
let floatingShadow: ShadowRoot | null = null;
let floatingFields: FormFieldDefinition[] = [];
let floatingContainer: Element | null = null;
let mutationObserver: MutationObserver | null = null;

function removeFloatingButton(): void {
  if (floatingHost && floatingHost.parentNode) {
    floatingHost.parentNode.removeChild(floatingHost);
  }
  floatingHost = null;
  floatingShadow = null;
  floatingFields = [];
  floatingContainer = null;
}

function ensurePositionRelative(el: HTMLElement): void {
  const style = window.getComputedStyle(el);
  if (style.position === 'static') {
    el.style.position = 'relative';
  }
}

function setButtonState(state: 'idle' | 'loading' | 'success' | 'error'): void {
  if (!floatingShadow) return;
  const btn = floatingShadow.getElementById('snapform-floating-btn') as HTMLButtonElement | null;
  if (!btn) return;
  const svg = btn.querySelector('svg') as SVGElement | null;
  if (!svg) return;

  if (state === 'idle') {
    btn.className = '';
    btn.disabled = false;
    btn.title = 'SnapForm - 一键填充';
    svg.innerHTML = '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>';
  } else if (state === 'loading') {
    btn.className = 'loading';
    btn.disabled = true;
    btn.title = '生成中...';
    svg.innerHTML = '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" fill="none" stroke-dasharray="28.3 28.3" transform="rotate(-90 12 12)"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle>';
  } else if (state === 'success') {
    btn.className = 'success';
    btn.disabled = true;
    btn.title = '填充成功';
    svg.innerHTML = '<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
  } else if (state === 'error') {
    btn.className = 'error';
    btn.disabled = false;
    btn.title = '填充失败，点击重试';
    svg.innerHTML = '<line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>';
  }
}

function findNearestFormNode(container: Element): Element {
  if (container !== document.body) return container;

  const visibleInputs = Array.from(container.querySelectorAll('input, select, textarea, .ant-select, .ant-picker, .el-select, .el-date-editor'))
    .filter(el => isElementVisible(el as HTMLElement)) as HTMLElement[];

  if (visibleInputs.length === 0) return container;
  if (visibleInputs.length === 1) return visibleInputs[0].parentElement || container;

  const getAncestors = (el: Element): Element[] => {
    const chain: Element[] = [];
    let current: Element | null = el;
    while (current && current !== document.body) {
      chain.push(current);
      current = current.parentElement;
    }
    return chain.reverse();
  };

  const sample = visibleInputs.slice(0, 6);
  const chains = sample.map(getAncestors);
  let lca: Element = document.body;
  const minLen = Math.min(...chains.map(c => c.length));
  for (let i = 0; i < minLen; i++) {
    const el = chains[0][i];
    if (chains.every(c => c[i] === el)) {
      lca = el;
    } else {
      break;
    }
  }

  if (lca === document.body) {
    let current: Element | null = visibleInputs[0].parentElement;
    while (current && current !== document.body) {
      const children = current.querySelectorAll('input, select, textarea');
      let count = 0;
      for (const c of Array.from(children)) {
        if (isElementVisible(c as HTMLElement)) {
          count++;
          if (count >= 2) {
            lca = current;
            break;
          }
        }
      }
      if (lca !== document.body) break;
      current = current.parentElement;
    }
  }

  return lca;
}

function injectFloatingButton(container: Element, fields: FormFieldDefinition[]): void {
  removeFloatingButton();
  floatingFields = fields;

  const target = findNearestFormNode(container);
  const targetEl = target as HTMLElement;
  ensurePositionRelative(targetEl);
  floatingContainer = target;

  floatingHost = document.createElement('div');
  floatingHost.id = FLOATING_BTN_ID;
  floatingHost.style.position = 'absolute';
  floatingHost.style.zIndex = '2147483647';
  floatingHost.style.top = '10px';
  floatingHost.style.right = '10px';

  floatingShadow = floatingHost.attachShadow({ mode: 'open' });
  floatingShadow.innerHTML = `
    <style>
      :host { all: initial; }
      #snapform-floating-btn {
        width: 24px; height: 24px; border-radius: 6px;
        background: rgba(255,255,255,0.85);
        color: #9a3412;
        border: 1px solid rgba(234,88,12,0.25);
        padding: 0;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.04);
        opacity: 0.55;
        transition: opacity 0.2s ease, transform 0.15s ease, border-color 0.2s ease, background 0.2s ease;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }
      #snapform-floating-btn:hover {
        opacity: 1;
        transform: scale(1.05);
        border-color: rgba(234,88,12,0.55);
        background: rgba(255,255,255,0.98);
        box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      }
      #snapform-floating-btn.loading {
        opacity: 0.85;
        cursor: default;
        border-color: rgba(234,88,12,0.4);
      }
      #snapform-floating-btn.success {
        opacity: 1;
        background: rgba(22,163,74,0.1);
        color: #15803d;
        border-color: rgba(22,163,74,0.4);
      }
      #snapform-floating-btn.error {
        opacity: 1;
        background: rgba(220,38,38,0.08);
        color: #b91c1c;
        border-color: rgba(220,38,38,0.35);
      }
      svg { width: 14px; height: 14px; display: block; }
    </style>
    <button id="snapform-floating-btn" title="SnapForm - 一键填充">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    </button>
  `;

  const btn = floatingShadow.getElementById('snapform-floating-btn') as HTMLButtonElement;
  btn.addEventListener('click', handleFloatingButtonClick);

  targetEl.appendChild(floatingHost);
}

async function handleFloatingButtonClick(): Promise<void> {
  if (floatingFields.length === 0) return;
  console.log('[SnapForm] Floating button clicked, fields:', floatingFields.length);
  setButtonState('loading');
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'QUICK_FILL',
      fields: floatingFields,
    });
    console.log('[SnapForm] QUICK_FILL response:', result);
    if (result && result.success) {
      setButtonState('success');
      setTimeout(() => setButtonState('idle'), 2000);
    } else {
      console.error('[SnapForm] QUICK_FILL failed:', result?.error);
      setButtonState('error');
      setTimeout(() => setButtonState('idle'), 2000);
    }
  } catch (e) {
    console.error('[SnapForm] Quick fill error:', e);
    setButtonState('error');
    setTimeout(() => setButtonState('idle'), 2000);
  }
}

async function initFloatingButton(): Promise<void> {
  if (!document.body) {
    setTimeout(initFloatingButton, 500);
    return;
  }

  try {
    const res = await chrome.storage.sync.get(['snapformSettings']);
    const settings = (res.snapformSettings as SnapFormSettings | undefined);
    if (settings && settings.showFloatingButton === false) {
      console.log('[SnapForm] Floating button disabled by settings');
      return;
    }
  } catch {
    // proceed anyway
  }

  const fields = detectFormFields(document);
  console.log('[SnapForm] initFloatingButton detected', fields.length, 'fields');
  if (fields.length > 0) {
    const container = findActiveFormContainer(document);
    injectFloatingButton(container, fields);
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  mutationObserver = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const res = await chrome.storage.sync.get(['snapformSettings']);
        const settings = (res.snapformSettings as SnapFormSettings | undefined);
        if (settings && settings.showFloatingButton === false) {
          removeFloatingButton();
          return;
        }
      } catch {
        // proceed
      }

      const newFields = detectFormFields(document);
      const newContainer = newFields.length > 0 ? findActiveFormContainer(document) : null;

      // No fields anymore -> remove
      if (newFields.length === 0) {
        removeFloatingButton();
        return;
      }

      // Fields and container unchanged -> keep existing button to avoid flicker
      if (
        floatingHost &&
        newFields.length === floatingFields.length &&
        newContainer === floatingContainer
      ) {
        return;
      }

      removeFloatingButton();
      injectFloatingButton(newContainer, newFields);
    }, 800);
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

window.addEventListener('beforeunload', () => {
  removeFloatingButton();
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
});

function scheduleInitFloatingButton(): void {
  const run = () => {
    // Give React/Next.js hydration a bit more time after load
    const delay = document.readyState === 'complete' ? 500 : 1500;
    setTimeout(initFloatingButton, delay);
  };

  if (document.readyState === 'complete') {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => run(), { timeout: 2000 });
    } else {
      run();
    }
  } else {
    window.addEventListener('load', () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => run(), { timeout: 2000 });
      } else {
        run();
      }
    }, { once: true });
  }
}

scheduleInitFloatingButton();

} // end main()
