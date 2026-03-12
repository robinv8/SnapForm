// Content script - runs on web pages to detect and fill forms

import { FormFieldDefinition, FormData } from '../types';
import { findActiveFormContainer, detectFields, isElementVisible } from '../detector/formDetector';

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
function fillFormFields(data: FormData): void {
  const container = findActiveFormContainer(document);
  const inputs = container.querySelectorAll('input, select, textarea');
  const inputsArray = Array.from(inputs) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];

  Object.entries(data).forEach(([fieldId, value]) => {
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

    if (!input) return;

    // Fill based on type
    if (input.tagName === 'SELECT') {
      (input as HTMLSelectElement).value = String(value);
    } else if ((input as HTMLInputElement).type === 'checkbox') {
      (input as HTMLInputElement).checked = Boolean(value);
    } else {
      (input as HTMLInputElement).value = String(value);
    }

    triggerInputEvents(input);
  });
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
      outline: 2px solid rgba(234, 88, 12, 0.8);
      outline-offset: 2px;
      animation: snapform-pulse 1.5s ease-in-out;
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
      fillFormFields(message.data);
      sendResponse({ success: true });
      break;

    case 'SET_DETECTED_FIELDS':
      detectedFields = message.fields;
      if (detectedFields.length > 0) highlightFields(detectedFields);
      sendResponse({ success: true });
      break;
  }

  return true;
});
