import { Page } from '@playwright/test';

/**
 * Inject the detection logic into a page and run it.
 * Returns detected fields from the active form container.
 * This mirrors what content.ts does, but runs in page context.
 */
export async function injectAndDetect(page: Page) {
  return page.evaluate(() => {
    // ── isElementVisible ──
    function isElementVisible(element: HTMLElement): boolean {
      if (element.hidden) return false;
      let current: HTMLElement | null = element;
      while (current) {
        if (current.style?.display === 'none') return false;
        if (current.style?.visibility === 'hidden') return false;
        try {
          const computed = window.getComputedStyle(current);
          if (computed.display === 'none') return false;
          if (computed.visibility === 'hidden') return false;
        } catch {}
        if (current.hidden) return false;
        current = current.parentElement;
      }
      if (document.body.offsetWidth > 0) {
        if (element.offsetWidth === 0 && element.offsetHeight === 0) return false;
      }
      return true;
    }

    function hasFormFields(el: Element): boolean {
      return el.querySelectorAll('input, select, textarea').length > 0;
    }

    function getEffectiveZIndex(el: HTMLElement): number {
      let cur: HTMLElement | null = el;
      let maxZ = 0;
      while (cur && cur !== document.body) {
        const z = parseInt(window.getComputedStyle(cur).zIndex, 10);
        if (!isNaN(z) && z > maxZ) maxZ = z;
        cur = cur.parentElement;
      }
      return maxZ;
    }

    function getTopmostByZIndex(elements: Element[]): Element {
      if (elements.length === 1) return elements[0];
      let topmost = elements[0];
      let highestZ = -Infinity;
      for (const el of elements) {
        const z = getEffectiveZIndex(el as HTMLElement);
        if (z > highestZ) { highestZ = z; topmost = el; }
      }
      return topmost;
    }

    // ── findActiveFormContainer ──
    function findActiveFormContainer(doc: Document): Element {
      const openDialogs = Array.from(doc.querySelectorAll('dialog[open]'));
      if (openDialogs.length > 0) return getTopmostByZIndex(openDialogs);

      const modalSelectors = [
        '[role="dialog"]', '[role="alertdialog"]',
        '.modal.show', '.modal.active', '.modal.open', '.modal.is-open', '.modal.in',
        '.modal-dialog', '.ant-modal-wrap', '.el-overlay', '.v-dialog--active',
        '.MuiModal-root', '.chakra-modal__overlay', '[data-state="open"]',
        '.overlay.active', '.popup.active', '.drawer.open', '.drawer.active',
      ];
      const modals: Element[] = [];
      for (const sel of modalSelectors) {
        try {
          doc.querySelectorAll(sel).forEach(el => {
            if (isElementVisible(el as HTMLElement) && hasFormFields(el)) modals.push(el);
          });
        } catch {}
      }
      if (modals.length > 0) return getTopmostByZIndex(modals);

      const forms = Array.from(doc.querySelectorAll('form'))
        .filter(f => isElementVisible(f) && hasFormFields(f));
      if (forms.length > 0) {
        return forms.sort((a, b) =>
          b.querySelectorAll('input,select,textarea').length -
          a.querySelectorAll('input,select,textarea').length
        )[0];
      }
      return doc.body;
    }

    // ── getFieldLabel ──
    function getFieldLabel(input: HTMLElement, container: Element): string {
      const inp = input as HTMLInputElement;
      if (input.id) {
        const label = container.querySelector(`label[for="${input.id}"]`);
        if (label?.textContent?.trim()) return label.textContent.trim();
      }
      const parentLabel = input.closest('label');
      if (parentLabel) {
        const clone = parentLabel.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('input,select,textarea').forEach(el => el.remove());
        const text = clone.textContent?.trim();
        if (text) return text;
      }
      const ariaLabel = input.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel;
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      if (ariaLabelledBy) {
        const el = container.querySelector(`#${ariaLabelledBy}`);
        if (el?.textContent?.trim()) return el.textContent.trim();
      }
      if (inp.placeholder) return inp.placeholder;
      if (input.title) return input.title;
      const prev = input.previousElementSibling;
      if (prev && ['SPAN','DIV','P'].includes(prev.tagName)) {
        const t = prev.textContent?.trim();
        if (t && t.length < 100) return t;
      }
      return inp.name || inp.id || 'Unknown Field';
    }

    function getFieldType(input: any): string {
      if (input.tagName === 'SELECT') return 'select';
      if (input.tagName === 'TEXTAREA') return 'textarea';
      const type = input.type?.toLowerCase() || 'text';
      if (['email','tel','number','checkbox','date','search'].includes(type)) return type;
      return 'text';
    }

    // ── detectFields ──
    function detectFields(container: Element) {
      const fields: any[] = [];
      const inputs = container.querySelectorAll('input, select, textarea');
      const seenIds = new Set<string>();
      inputs.forEach((element, index) => {
        const input = element as HTMLInputElement;
        const skipTypes = ['hidden','submit','button','image','file','reset'];
        if (skipTypes.includes(input.type)) return;
        if (!isElementVisible(input)) return;
        let fieldId = input.id || input.name || `field_${index}`;
        let uniqueId = fieldId;
        let counter = 1;
        while (seenIds.has(uniqueId)) { uniqueId = `${fieldId}_${counter}`; counter++; }
        seenIds.add(uniqueId);
        fields.push({
          id: uniqueId,
          name: input.name || uniqueId,
          label: getFieldLabel(input, container),
          type: getFieldType(input),
          required: input.hasAttribute('required'),
          tagName: input.tagName,
        });
      });
      return fields;
    }

    // ── Run ──
    const container = findActiveFormContainer(document);
    const fields = detectFields(container);
    return {
      containerTag: container.tagName,
      containerId: (container as HTMLElement).id || '',
      containerClass: (container as HTMLElement).className?.substring?.(0, 100) || '',
      url: window.location.href,
      title: document.title,
      totalInputs: document.querySelectorAll('input, select, textarea').length,
      fields,
    };
  });
}
