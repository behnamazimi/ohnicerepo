import type { FilterParams } from '@ohnicerepo/shared';

export function generateClientCacheKey(params: FilterParams): string {
  const datePart =
    params.dateType === 'range'
      ? `${params.startDate || ''}-${params.endDate || ''}`
      : `${params.days}`;
  return `ohnicerepo-${datePart}-${params.stars}-${params.page}-${params.perPage}-${params.language}-${params.dateType}`;
}
