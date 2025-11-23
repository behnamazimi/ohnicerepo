import type { DateFilterState } from '../types';

interface PersistedFilters {
  dateFilter: DateFilterState;
  stars: number;
  language: string;
  dateType: 'exact' | 'after';
}

const STORAGE_KEY = 'ohnicerepo-filters';

export function loadPersistedFilters(): Partial<PersistedFilters> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return parsed;
  } catch (e) {
    // If parsing fails, return null
    return null;
  }
}

export function savePersistedFilters(filters: PersistedFilters): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (e) {
    // If storage fails (e.g., quota exceeded), silently fail
    console.warn('Failed to save filters to localStorage:', e);
  }
}

