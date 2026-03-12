import { FillHistoryEntry, FillHistoryField, FormFieldDefinition, FormData, FillMode } from '../types';

const STORAGE_KEY = 'fillHistory';
const MAX_HISTORY = 200;

/**
 * Save a fill operation to history.
 */
export async function saveFillHistory(
  url: string,
  pageTitle: string,
  fields: FormFieldDefinition[],
  data: FormData,
  mode: FillMode
): Promise<void> {
  const entry: FillHistoryEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    url,
    domain: extractDomain(url),
    pageTitle: pageTitle || url,
    fields: fields
      .filter(f => data[f.id] !== undefined && data[f.id] !== '')
      .map(f => ({
        name: f.name,
        label: f.label,
        value: data[f.id],
        type: f.type,
      })),
    mode,
  };

  const history = await getHistory();
  history.unshift(entry);

  // Keep only the latest N entries
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: history });
}

/**
 * Get all history entries, newest first.
 */
export async function getHistory(): Promise<FillHistoryEntry[]> {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  return (result[STORAGE_KEY] as FillHistoryEntry[]) || [];
}

/**
 * Delete a single history entry by ID.
 */
export async function deleteHistoryEntry(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter(e => e.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

/**
 * Clear all history.
 */
export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: [] });
}

/**
 * Search history by domain or page title.
 */
export async function searchHistory(query: string): Promise<FillHistoryEntry[]> {
  const history = await getHistory();
  const q = query.toLowerCase();
  return history.filter(
    e => e.domain.toLowerCase().includes(q) ||
         e.pageTitle.toLowerCase().includes(q) ||
         e.fields.some(f => f.label.toLowerCase().includes(q) || String(f.value).toLowerCase().includes(q))
  );
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
