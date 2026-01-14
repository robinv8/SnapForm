// Content script - runs on web pages to detect and fill forms

import { FormFieldDefinition, FormData } from '../types';

// Message types for communication with popup
interface DetectFormsMessage {
  type: 'DETECT_FORMS';
}

interface FillFormMessage {
  type: 'FILL_FORM';
  data: FormData;
}

type Message = DetectFormsMessage | FillFormMessage;

// Detect all form fields on the current page
function detectFormFields(): FormFieldDefinition[] {
  const fields: FormFieldDefinition[] = [];
  const inputs = document.querySelectorAll('input, select, textarea');

  inputs.forEach((element, index) => {
    const input = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    
    // Skip hidden, submit, and button inputs
    if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'image') {
      return;
    }

    // Get field information
    const id = input.id || `field_${index}`;
    const name = input.name || id;
    const label = getFieldLabel(input);
    const type = getFieldType(input);
    const required = input.hasAttribute('required');

    // Get options for select elements
    let options: string[] | undefined;
    if (input.tagName === 'SELECT') {
      const selectElement = input as HTMLSelectElement;
      options = Array.from(selectElement.options)
        .filter(opt => opt.value)
        .map(opt => opt.value);
    }

    fields.push({
      id,
      name,
      label,
      type,
      required,
      options
    });
  });

  return fields;
}

// Get label text for an input field
function getFieldLabel(input: HTMLElement): string {
  // Try to find associated label
  const inputId = input.id;
  if (inputId) {
    const label = document.querySelector(`label[for="${inputId}"]`);
    if (label?.textContent) {
      return label.textContent.trim();
    }
  }

  // Try to find parent label
  const parentLabel = input.closest('label');
  if (parentLabel?.textContent) {
    return parentLabel.textContent.trim();
  }

  // Use placeholder or name as fallback
  const inputElement = input as HTMLInputElement;
  return inputElement.placeholder || inputElement.name || 'Unknown Field';
}

// Determine field type
function getFieldType(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): FormFieldDefinition['type'] {
  if (input.tagName === 'SELECT') return 'select';
  if (input.tagName === 'TEXTAREA') return 'textarea';
  
  const inputElement = input as HTMLInputElement;
  const type = inputElement.type.toLowerCase();

  switch (type) {
    case 'email': return 'email';
    case 'tel': return 'tel';
    case 'number': return 'number';
    case 'checkbox': return 'checkbox';
    case 'date': return 'date';
    default: return 'text';
  }
}

// Fill form fields with provided data
function fillFormFields(data: FormData): void {
  Object.entries(data).forEach(([fieldName, value]) => {
    // Try to find input by name
    let input = document.querySelector(`input[name="${fieldName}"], select[name="${fieldName}"], textarea[name="${fieldName}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    
    // Try to find by id if name didn't work
    if (!input) {
      input = document.querySelector(`input[id="${fieldName}"], select[id="${fieldName}"], textarea[id="${fieldName}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    }

    if (!input) return;

    // Fill based on input type
    if (input.tagName === 'SELECT') {
      (input as HTMLSelectElement).value = String(value);
    } else if ((input as HTMLInputElement).type === 'checkbox') {
      (input as HTMLInputElement).checked = Boolean(value);
    } else {
      (input as HTMLInputElement).value = String(value);
    }

    // Trigger change event to ensure any listeners are notified
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  console.log('FormFiller Pro: Form filled successfully');
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  if (message.type === 'DETECT_FORMS') {
    const fields = detectFormFields();
    sendResponse({ fields });
  } else if (message.type === 'FILL_FORM') {
    fillFormFields(message.data);
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});

console.log('FormFiller Pro: Content script loaded');
