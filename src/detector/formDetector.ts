import { FormFieldDefinition } from '../types';

// Native + UI library custom component selectors
const NATIVE_INPUT_SELECTOR = 'input, select, textarea';
const CUSTOM_COMPONENT_SELECTORS = [
  '.ant-select:not(.ant-select-disabled)',           // Ant Design Select
  '.ant-picker:not(.ant-picker-disabled)',            // Ant Design DatePicker/TimePicker
  '.ant-cascader:not(.ant-cascader-disabled)',         // Ant Design Cascader
  '.ant-input-number:not(.ant-input-number-disabled)', // Ant Design InputNumber
  '.ant-switch',                                       // Ant Design Switch
  '.ant-rate',                                         // Ant Design Rate
  '.ant-slider',                                       // Ant Design Slider
  '.el-select',                                        // Element UI/Plus Select
  '.el-date-editor',                                   // Element UI/Plus DatePicker
  '.el-cascader',                                      // Element UI/Plus Cascader
  '.el-input-number',                                  // Element UI/Plus InputNumber
  '.el-switch',                                        // Element UI/Plus Switch
];
const ALL_FIELD_SELECTOR = [NATIVE_INPUT_SELECTOR, ...CUSTOM_COMPONENT_SELECTORS].join(', ');

/**
 * Find the topmost active form container on the page.
 * Priority: open <dialog> > highest z-index modal > <form> / .ant-form > whole page
 */
export function findActiveFormContainer(doc: Document): Element {
  // 1. Check for open <dialog> elements — take the topmost one
  const openDialogs = Array.from(doc.querySelectorAll('dialog[open]'));
  if (openDialogs.length > 0) {
    return getTopmostByZIndex(openDialogs);
  }

  // 2. Check for modal/overlay containers with high z-index
  const modalSelectors = [
    '[role="dialog"]',
    '[role="alertdialog"]',
    '.modal.show',
    '.modal.active',
    '.modal.open',
    '.modal.is-open',
    '.modal.in',         // Bootstrap 3
    '.modal-dialog',
    '.ant-modal-wrap',   // Ant Design
    '.ant-drawer-open',  // Ant Design Drawer
    '.el-dialog__wrapper:not([style*="display: none"])', // Element UI
    '.el-overlay',       // Element Plus
    '.v-dialog--active', // Vuetify
    '.MuiModal-root',    // MUI
    '.chakra-modal__overlay', // Chakra UI
    '[data-state="open"]',    // Radix UI / shadcn
    '.overlay.active',
    '.popup.active',
    '.drawer.open',
    '.drawer.active',
  ];

  const modals: Element[] = [];
  for (const selector of modalSelectors) {
    try {
      const found = doc.querySelectorAll(selector);
      found.forEach(el => {
        if (isElementVisible(el as HTMLElement) && hasFormFields(el)) {
          modals.push(el);
        }
      });
    } catch {
      // Invalid selector, skip
    }
  }

  if (modals.length > 0) {
    return getTopmostByZIndex(modals);
  }

  // 3. Fallback to <form> or UI library form containers
  const formSelectors = 'form, .ant-form, .el-form';
  const forms = Array.from(doc.querySelectorAll(formSelectors));
  const visibleForms = forms.filter(f => isElementVisible(f as HTMLElement) && hasFormFields(f));
  if (visibleForms.length > 0) {
    // If multiple forms, return the one with most fields
    return visibleForms.sort((a, b) => countFormFields(b) - countFormFields(a))[0];
  }

  // 4. Last resort: body
  return doc.body;
}

/**
 * Detect fillable form fields within a container element.
 * Supports native HTML elements + Ant Design / Element UI custom components.
 */
export function detectFields(container: Element): FormFieldDefinition[] {
  const fields: FormFieldDefinition[] = [];
  const seenIds = new Set<string>();

  // Phase 1: Native inputs
  const nativeInputs = container.querySelectorAll(NATIVE_INPUT_SELECTOR);
  let fieldIndex = 0;

  nativeInputs.forEach((element) => {
    const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    // Skip non-fillable types
    const skipTypes = ['hidden', 'submit', 'button', 'image', 'file', 'reset'];
    if (skipTypes.includes(input.type)) return;

    // Skip invisible inputs
    if (!isElementVisible(input)) return;

    // Skip inputs that are internal parts of custom components
    // (e.g. hidden input inside .ant-select, .ant-picker search input)
    if (isInsideCustomComponent(input)) return;

    // Generate unique ID
    let fieldId = input.id || input.name || `field_${fieldIndex}`;
    let uniqueId = fieldId;
    let counter = 1;
    while (seenIds.has(uniqueId)) {
      uniqueId = `${fieldId}_${counter}`;
      counter++;
    }
    seenIds.add(uniqueId);
    fieldIndex++;

    fields.push({
      id: uniqueId,
      name: input.name || uniqueId,
      label: getFieldLabel(input, container),
      type: getFieldType(input),
      required: input.hasAttribute('required') || isRequiredByUI(input),
      options:
        input.tagName === 'SELECT'
          ? Array.from((input as HTMLSelectElement).options)
              .filter(o => o.value)
              .map(o => o.value)
          : undefined,
    });
  });

  // Phase 2: Custom UI components (Ant Design, Element UI, etc.)
  for (const selector of CUSTOM_COMPONENT_SELECTORS) {
    try {
      const components = container.querySelectorAll(selector);
      components.forEach((comp) => {
        if (!isElementVisible(comp as HTMLElement)) return;

        const info = parseCustomComponent(comp, container, fieldIndex);
        if (!info) return;

        let uniqueId = info.id;
        let counter = 1;
        while (seenIds.has(uniqueId)) {
          uniqueId = `${info.id}_${counter}`;
          counter++;
        }
        seenIds.add(uniqueId);
        fieldIndex++;

        fields.push({
          id: uniqueId,
          name: info.name,
          label: info.label,
          type: info.type,
          required: info.required,
          options: info.options,
        });
      });
    } catch {
      // Invalid selector, skip
    }
  }

  return fields;
}

/**
 * Full detection pipeline: find container, then detect fields inside it.
 */
export function detectFormFields(doc: Document): FormFieldDefinition[] {
  const container = findActiveFormContainer(doc);
  return detectFields(container);
}

// ─── Custom Component Parsing ───────────────────────────────────

interface ParsedField {
  id: string;
  name: string;
  label: string;
  type: FormFieldDefinition['type'];
  required: boolean;
  options?: string[];
}

/**
 * Check if a native input is an internal part of a custom component
 * (should be skipped to avoid double-counting).
 */
function isInsideCustomComponent(input: HTMLElement): boolean {
  // Ant Design: inputs inside .ant-select, .ant-picker are search/display inputs
  const antParent = input.closest('.ant-select, .ant-picker, .ant-cascader, .ant-input-number');
  if (antParent) {
    // Exception: .ant-input-number has a real input we should skip
    // (the custom component handler will pick it up)
    // But standalone .ant-input inside .ant-form-item is a real input
    if (input.closest('.ant-input-number')) return true;
    if (input.classList.contains('ant-select-selection-search-input')) return true;
    if (input.classList.contains('ant-picker-input')) return true;
    // The actual input inside ant-picker
    if (input.closest('.ant-picker')) return true;
    if (input.closest('.ant-cascader')) return true;
    if (input.closest('.ant-select')) return true;
  }

  // Element UI: inputs inside custom components
  const elParent = input.closest('.el-select, .el-date-editor, .el-cascader, .el-input-number');
  if (elParent) {
    if (input.closest('.el-select')) return true;
    if (input.closest('.el-cascader')) return true;
  }

  return false;
}

/**
 * Parse a custom UI component into a field definition.
 */
function parseCustomComponent(
  comp: Element,
  container: Element,
  index: number
): ParsedField | null {
  const el = comp as HTMLElement;

  // Try to find ID from internal input or data attributes
  const innerInput = comp.querySelector('input, textarea') as HTMLInputElement | null;
  const dataId = comp.getAttribute('id') || innerInput?.id || innerInput?.name;
  const id = dataId || `field_${index}`;
  const name = innerInput?.name || id;

  // Determine label
  const label = getCustomComponentLabel(el, container) || name;

  // Determine type and options
  let type: FormFieldDefinition['type'] = 'text';
  let options: string[] | undefined;

  if (comp.matches('.ant-select, .el-select')) {
    type = 'select';
    // Try to extract options from dropdown (may not be rendered yet)
    options = extractSelectOptions(comp);
  } else if (comp.matches('.ant-picker, .el-date-editor')) {
    type = 'date';
  } else if (comp.matches('.ant-cascader, .el-cascader')) {
    type = 'select';
  } else if (comp.matches('.ant-input-number, .el-input-number')) {
    type = 'number';
  } else if (comp.matches('.ant-switch, .el-switch')) {
    type = 'checkbox';
  } else if (comp.matches('.ant-rate')) {
    type = 'number';
  } else if (comp.matches('.ant-slider')) {
    type = 'number';
  }

  // Determine required
  const required = isRequiredByUI(el);

  return { id, name, label, type, required, options };
}

/**
 * Extract select options from Ant Design / Element UI select components.
 */
function extractSelectOptions(comp: Element): string[] | undefined {
  // Ant Design: options might be in a dropdown portal, not inside the component
  // Try data attributes first
  const options: string[] = [];

  // Check for .ant-select-item-option in nearby dropdown
  const dropdownId = comp.querySelector('.ant-select-selection-search-input')?.getAttribute('aria-controls');
  if (dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      dropdown.querySelectorAll('.ant-select-item-option').forEach(opt => {
        const val = opt.getAttribute('title') || opt.textContent?.trim();
        if (val) options.push(val);
      });
    }
  }

  // Element UI: .el-select-dropdown__item
  comp.querySelectorAll('.el-select-dropdown__item, .el-option').forEach(opt => {
    const val = (opt as HTMLElement).dataset.value || opt.textContent?.trim();
    if (val) options.push(val);
  });

  return options.length > 0 ? options : undefined;
}

/**
 * Get label for a custom UI component using UI library conventions.
 */
function getCustomComponentLabel(el: HTMLElement, container: Element): string {
  // Strategy 1: Find parent .ant-form-item / .el-form-item and extract label
  const formItem = el.closest('.ant-form-item, .el-form-item');
  if (formItem) {
    // Ant Design: .ant-form-item-label > label
    const antLabel = formItem.querySelector('.ant-form-item-label label, .ant-form-item-label > span');
    if (antLabel?.textContent?.trim()) return antLabel.textContent.trim();

    // Element UI: .el-form-item__label
    const elLabel = formItem.querySelector('.el-form-item__label');
    if (elLabel?.textContent?.trim()) return elLabel.textContent.trim();
  }

  // Strategy 2: aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Strategy 3: placeholder from inner input
  const innerInput = el.querySelector('input') as HTMLInputElement | null;
  if (innerInput?.placeholder) return innerInput.placeholder;

  // Strategy 4: placeholder text in component
  const placeholder = el.querySelector('.ant-select-selection-placeholder, .el-select__placeholder');
  if (placeholder?.textContent?.trim()) return placeholder.textContent.trim();

  return '';
}

// ─── Helpers ────────────────────────────────────────────────────

export function isElementVisible(element: HTMLElement): boolean {
  // Check hidden attribute
  if (element.hidden) return false;

  // Walk up the tree checking for explicit hiding
  let current: HTMLElement | null = element;
  while (current) {
    // Check inline style
    const inlineDisplay = current.style?.display;
    if (inlineDisplay === 'none') return false;

    const inlineVisibility = current.style?.visibility;
    if (inlineVisibility === 'hidden') return false;

    // Check computed style if available (real browser)
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      try {
        const computed = window.getComputedStyle(current);
        if (computed.display === 'none') return false;
        if (computed.visibility === 'hidden') return false;
      } catch {
        // getComputedStyle may fail in some environments
      }
    }

    // Check hidden attribute on ancestors
    if (current.hidden) return false;

    current = current.parentElement;
  }

  // In real browsers, also check dimensions
  if (element.offsetWidth !== undefined && element.offsetHeight !== undefined) {
    const hasLayout = element.offsetWidth > 0 || element.offsetHeight > 0;
    if (document.body.offsetWidth > 0 && !hasLayout) {
      return false;
    }
  }

  return true;
}

/**
 * Check if an element is marked as required via UI library conventions.
 */
function isRequiredByUI(el: HTMLElement): boolean {
  // Ant Design: parent .ant-form-item has .ant-form-item-required class on label
  const formItem = el.closest('.ant-form-item, .el-form-item');
  if (formItem) {
    if (formItem.querySelector('.ant-form-item-required')) return true;
    // Element UI: .el-form-item.is-required
    if (formItem.classList.contains('is-required')) return true;
    // Ant Design v5: .ant-form-item-required class on label
    if (formItem.querySelector('[class*="required"]')) return true;
  }
  return false;
}

function hasFormFields(el: Element): boolean {
  return el.querySelectorAll(ALL_FIELD_SELECTOR).length > 0;
}

function countFormFields(el: Element): number {
  return el.querySelectorAll(ALL_FIELD_SELECTOR).length;
}

function getTopmostByZIndex(elements: Element[]): Element {
  if (elements.length === 1) return elements[0];

  let topmost = elements[0];
  let highestZ = -Infinity;

  for (const el of elements) {
    const z = getEffectiveZIndex(el as HTMLElement);
    if (z > highestZ) {
      highestZ = z;
      topmost = el;
    }
  }

  return topmost;
}

function getEffectiveZIndex(el: HTMLElement): number {
  let current: HTMLElement | null = el;
  let maxZ = 0;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const z = parseInt(style.zIndex, 10);
    if (!isNaN(z) && z > maxZ) {
      maxZ = z;
    }
    current = current.parentElement;
  }

  return maxZ;
}

function getFieldLabel(input: HTMLElement, container: Element): string {
  const inputElement = input as HTMLInputElement;

  // 1. Try Ant Design / Element UI form item label
  const formItem = input.closest('.ant-form-item, .el-form-item');
  if (formItem) {
    const antLabel = formItem.querySelector('.ant-form-item-label label, .ant-form-item-label > span');
    if (antLabel?.textContent?.trim()) return antLabel.textContent.trim();

    const elLabel = formItem.querySelector('.el-form-item__label');
    if (elLabel?.textContent?.trim()) return elLabel.textContent.trim();
  }

  // 2. Try label[for]
  if (input.id) {
    const label = container.querySelector(`label[for="${input.id}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }

  // 3. Try wrapping <label>
  const parentLabel = input.closest('label');
  if (parentLabel) {
    // Get label text excluding the input's own text
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, textarea').forEach(el => el.remove());
    const text = clone.textContent?.trim();
    if (text) return text;
  }

  // 4. Try aria-label / aria-labelledby
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const ariaLabelledBy = input.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelEl = container.querySelector(`#${ariaLabelledBy}`);
    if (labelEl?.textContent?.trim()) return labelEl.textContent.trim();
  }

  // 5. Try placeholder
  if (inputElement.placeholder) return inputElement.placeholder;

  // 6. Try title attribute
  if (input.title) return input.title;

  // 7. Try preceding sibling text or nearby text
  const prev = input.previousElementSibling;
  if (prev && (prev.tagName === 'SPAN' || prev.tagName === 'DIV' || prev.tagName === 'P')) {
    const text = prev.textContent?.trim();
    if (text && text.length < 100) return text;
  }

  // 8. Fallback to name/id
  return inputElement.name || inputElement.id || 'Unknown Field';
}

function getFieldType(
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
): FormFieldDefinition['type'] {
  if (input.tagName === 'SELECT') return 'select';
  if (input.tagName === 'TEXTAREA') return 'textarea';

  const type = (input as HTMLInputElement).type?.toLowerCase() || 'text';
  switch (type) {
    case 'email':
      return 'email';
    case 'tel':
      return 'tel';
    case 'number':
      return 'number';
    case 'checkbox':
      return 'checkbox';
    case 'date':
      return 'date';
    case 'search':
      return 'text';
    default:
      return 'text';
  }
}
