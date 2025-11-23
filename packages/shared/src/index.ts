export interface Repository {
  id: number;
  name: string;
  description: string | null;
  stars: number;
  language: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse {
  total: number;
  repos: Repository[];
  page: number;
  perPage: number;
  totalPages: number;
  rateLimit?: {
    remaining: number;
    limit: number;
    reset: number;
  };
}

export interface ClientCacheEntry {
  data: ApiResponse;
  timestamp: number;
  ttl: number; // 5 minutes in ms
}

export type DateFilterType = 'preset' | 'custom' | 'absolute' | 'range';
export type DatePreset = '1h' | '1d' | '7d' | '14d' | '30d' | '90d';

export interface DateFilterState {
  type: DateFilterType;
  preset?: DatePreset;
  customValue?: string;
  absoluteDate?: string;
  startDate?: string; // YYYY-MM-DD format for range start
  endDate?: string; // YYYY-MM-DD format for range end
  days: number;
}

export interface RateLimit {
  remaining: number;
  limit: number;
  reset: number;
}

export interface FilterParams {
  days: number;
  stars: number;
  page: number;
  perPage: number;
  language: string;
  dateType: 'exact' | 'after' | 'range';
  startDate?: string; // YYYY-MM-DD format for range start
  endDate?: string; // YYYY-MM-DD format for range end
}

export interface LanguageOption {
  value: string;
  label: string;
}
