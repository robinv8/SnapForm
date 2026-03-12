import { messages, type Locale, type MessageKey } from './messages';

function detectLocale(): Locale {
  try {
    const lang = chrome?.i18n?.getUILanguage?.() || navigator.language;
    if (lang.startsWith('zh')) return 'zh';
    return 'en';
  } catch {
    return navigator.language.startsWith('zh') ? 'zh' : 'en';
  }
}

let currentLocale: Locale = detectLocale();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let text: string = messages[currentLocale][key] || messages.zh[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

export type { MessageKey, Locale };
