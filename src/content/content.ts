// Content script - runs on web pages to detect and fill forms

import { FormFieldDefinition, FormData } from '../types';

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

// Get relevant form HTML from the page
function getFormHtml(): string {
  // Try to find forms first
  const forms = document.querySelectorAll('form');
  if (forms.length > 0) {
    return Array.from(forms).map(form => form.outerHTML).join('\n');
  }

  // Try to find modal dialogs (common in Bootstrap/React)
  const modals = document.querySelectorAll('.modal, [role="dialog"], .dialog, .modal-content');
  if (modals.length > 0) {
    return Array.from(modals).map(modal => modal.outerHTML).join('\n');
  }

  // Try to find common form containers
  const containers = document.querySelectorAll('.form, .form-group, .form-container, [class*="form"]');
  if (containers.length > 0) {
    return Array.from(containers).slice(0, 5).map(c => c.outerHTML).join('\n');
  }

  // Fallback: get main content area
  const main = document.querySelector('main, .main, #main, .content, #content, .container');
  if (main) {
    return main.outerHTML;
  }

  // Last resort: get body but limit size
  const body = document.body.innerHTML;
  return body.substring(0, 50000); // Limit to ~50KB
}

// Simple local detection as fallback
function detectFormFieldsLocally(): FormFieldDefinition[] {
  const fields: FormFieldDefinition[] = [];
  const inputs = document.querySelectorAll('input, select, textarea');
  const seenIds = new Set<string>();

  inputs.forEach((element, index) => {
    const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    
    // Skip non-fillable types
    const skipTypes = ['hidden', 'submit', 'button', 'image', 'file', 'reset'];
    if (skipTypes.includes(input.type)) {
      return;
    }

    // Skip invisible inputs
    if (!isElementVisible(input)) {
      return;
    }

    // Generate unique ID
    let fieldId = input.id || input.name || `field_${index}`;
    let uniqueId = fieldId;
    let counter = 1;
    while (seenIds.has(uniqueId)) {
      uniqueId = `${fieldId}_${counter}`;
      counter++;
    }
    seenIds.add(uniqueId);

    fields.push({
      id: uniqueId,
      name: input.name || uniqueId,
      label: getFieldLabel(input, index),
      type: getFieldType(input),
      required: input.hasAttribute('required'),
      options: input.tagName === 'SELECT' 
        ? Array.from((input as HTMLSelectElement).options).filter(o => o.value).map(o => o.value)
        : undefined
    });
  });

  return fields;
}

// Check if element is visible
function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

// Get label for a field
function getFieldLabel(input: HTMLElement, index: number): string {
  const inputElement = input as HTMLInputElement;
  
  // Try label[for]
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label?.textContent) return label.textContent.trim();
  }
  
  // Try parent label
  const parentLabel = input.closest('label');
  if (parentLabel?.textContent) return parentLabel.textContent.trim();
  
  // Try placeholder
  if (inputElement.placeholder) return inputElement.placeholder;
  
  // Try name/id
  return inputElement.name || inputElement.id || `Field ${index + 1}`;
}

// Get field type
function getFieldType(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): FormFieldDefinition['type'] {
  if (input.tagName === 'SELECT') return 'select';
  if (input.tagName === 'TEXTAREA') return 'textarea';
  
  const type = (input as HTMLInputElement).type?.toLowerCase() || 'text';
  switch (type) {
    case 'email': return 'email';
    case 'tel': return 'tel';
    case 'number': return 'number';
    case 'checkbox': return 'checkbox';
    case 'date': return 'date';
    default: return 'text';
  }
}

// Fill form fields with data
function fillFormFields(data: FormData): void {
  console.log('FormFiller Pro: Filling with data', data);
  
  // Build a map of all inputs for quick lookup
  const inputs = document.querySelectorAll('input, select, textarea');
  const inputsArray = Array.from(inputs) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];
  
  // Track which fields we've filled to handle duplicates
  const filledIds = new Set<string>();
  
  Object.entries(data).forEach(([fieldId, value]) => {
    // Try to find input by id, name, or generated field id
    let input = inputsArray.find(i => i.id === fieldId || i.name === fieldId);
    
    // For generated IDs like "field_0", "field_1", find by index
    if (!input && fieldId.startsWith('field_')) {
      const match = fieldId.match(/^field_(\d+)(?:_(\d+))?$/);
      if (match) {
        const visibleInputs = inputsArray.filter(i => {
          const skipTypes = ['hidden', 'submit', 'button', 'image', 'file', 'reset'];
          return !skipTypes.includes(i.type) && isElementVisible(i);
        });
        const index = parseInt(match[1]);
        const subIndex = match[2] ? parseInt(match[2]) : 0;
        
        // Find the right input considering duplicates
        let count = 0;
        for (const i of visibleInputs) {
          const id = i.id || i.name || `field_${visibleInputs.indexOf(i)}`;
          if (id === fieldId || (!i.id && !i.name && visibleInputs.indexOf(i) === index)) {
            if (count === subIndex) {
              input = i;
              break;
            }
            count++;
          }
        }
        
        // Fallback to direct index
        if (!input && index < visibleInputs.length) {
          input = visibleInputs[index];
        }
      }
    }
    
    if (!input) {
      console.log(`FormFiller Pro: Could not find input for ${fieldId}`);
      return;
    }
    
    // Fill based on type
    if (input.tagName === 'SELECT') {
      (input as HTMLSelectElement).value = String(value);
    } else if ((input as HTMLInputElement).type === 'checkbox') {
      (input as HTMLInputElement).checked = Boolean(value);
    } else {
      (input as HTMLInputElement).value = String(value);
    }
    
    // Trigger events for all frameworks
    triggerInputEvents(input);
    filledIds.add(fieldId);
  });
  
  console.log(`FormFiller Pro: Filled ${filledIds.size} fields`);
}

// Trigger events for React/Vue/Angular compatibility
function triggerInputEvents(input: HTMLElement): void {
  // Native events
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  
  // For React controlled components
  const inputEl = input as HTMLInputElement;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set;
  
  if (nativeInputValueSetter && input.tagName === 'INPUT') {
    const currentValue = inputEl.value;
    nativeInputValueSetter.call(input, currentValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.log('FormFiller Pro: Received message', message.type);
  
  switch (message.type) {
    case 'DETECT_FORMS':
      // Local detection as fallback
      const fields = detectFormFieldsLocally();
      console.log('FormFiller Pro: Detected fields locally', fields);
      sendResponse({ fields });
      break;
      
    case 'GET_FORM_HTML':
      // Get HTML for AI analysis
      const html = getFormHtml();
      console.log('FormFiller Pro: Got form HTML, length:', html.length);
      sendResponse({ html });
      break;
      
    case 'FILL_FORM':
      fillFormFields(message.data);
      sendResponse({ success: true });
      break;
      
    case 'SET_DETECTED_FIELDS':
      // Store AI-detected fields
      detectedFields = message.fields;
      console.log('FormFiller Pro: Stored AI-detected fields', detectedFields);
      sendResponse({ success: true });
      break;
  }
  
  return true;
});

console.log('FormFiller Pro: Content script loaded v2');
