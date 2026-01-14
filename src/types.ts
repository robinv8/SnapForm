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