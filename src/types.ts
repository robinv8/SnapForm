export interface FormFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'checkbox' | 'date' | 'textarea';
  options?: string[]; // For select inputs
  required?: boolean;
}

export interface FormData {
  [key: string]: string | boolean | number;
}

export enum FillMode {
  STANDARD = 'STANDARD', // Heuristic/Regex based
  AI = 'AI', // Gemini based
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  mode: FillMode;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error';
}

export type AIProvider = 'gemini' | 'openai' | 'deepseek' | 'custom';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string; // For custom OpenAI-compatible endpoints
}

export const AI_PROVIDER_DEFAULTS: Record<AIProvider, { name: string; models: string[]; baseUrl: string; keyUrl: string }> = {
  gemini: {
    name: 'Google Gemini',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyUrl: 'https://aistudio.google.com/app/apikey',
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1-nano'],
    baseUrl: 'https://api.openai.com/v1',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  deepseek: {
    name: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    baseUrl: 'https://api.deepseek.com/v1',
    keyUrl: 'https://platform.deepseek.com/api_keys',
  },
  custom: {
    name: '自定义 (OpenAI 兼容)',
    models: [],
    baseUrl: '',
    keyUrl: '',
  },
};

export interface FillHistoryField {
  name: string;
  label: string;
  value: string | boolean | number;
  type: string;
}

export interface FillHistoryEntry {
  id: string;
  timestamp: number; // Date.now() for serialization
  url: string;
  domain: string;
  pageTitle: string;
  fields: FillHistoryField[];
  mode: FillMode;
}