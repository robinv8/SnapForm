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

export type AIProvider = 'gemini' | 'openai' | 'deepseek' | 'groq' | 'mistral' | 'openrouter' | 'siliconflow' | 'zhipu' | 'moonshot' | 'custom';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string; // For custom OpenAI-compatible endpoints
  defaultFillMode?: FillMode; // 默认填充模式，默认为 AI（如果配置有效）
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
  groq: {
    name: 'Groq',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it', 'mixtral-8x7b-32768'],
    baseUrl: 'https://api.groq.com/openai/v1',
    keyUrl: 'https://console.groq.com/keys',
  },
  mistral: {
    name: 'Mistral',
    models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
    baseUrl: 'https://api.mistral.ai/v1',
    keyUrl: 'https://console.mistral.ai/api-keys',
  },
  openrouter: {
    name: 'OpenRouter',
    models: ['google/gemini-2.0-flash-001', 'anthropic/claude-sonnet-4', 'openai/gpt-4o-mini'],
    baseUrl: 'https://openrouter.ai/api/v1',
    keyUrl: 'https://openrouter.ai/keys',
  },
  siliconflow: {
    name: '硅基流动',
    models: ['Qwen/Qwen2.5-7B-Instruct', 'deepseek-ai/DeepSeek-V3', 'Pro/Qwen/Qwen2.5-72B-Instruct'],
    baseUrl: 'https://api.siliconflow.cn/v1',
    keyUrl: 'https://cloud.siliconflow.cn/account/ak',
  },
  zhipu: {
    name: '智谱 AI',
    models: ['glm-4-flash', 'glm-4-plus', 'glm-4-long'],
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
  moonshot: {
    name: 'Moonshot (Kimi)',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    baseUrl: 'https://api.moonshot.cn/v1',
    keyUrl: 'https://platform.moonshot.cn/console/api-keys',
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