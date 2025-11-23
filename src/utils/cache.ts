import type { FilterParams } from '../types';

export function generateClientCacheKey(params: FilterParams): string {
  return `ohnicerepo-${params.days}-${params.stars}-${params.page}-${params.perPage}-${params.language}-${params.dateType}`;
}

