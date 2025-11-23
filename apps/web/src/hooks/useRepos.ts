import { useState, useEffect, useCallback } from 'react';
import type { ApiResponse, FilterParams, RateLimit } from '@ohnicerepo/shared';
import { fetchRepositories } from '../services/api';
import { useDebounce } from './useDebounce';

export function useRepos(params: FilterParams) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);

  const fetchRepos = useCallback(
    async (skipCache = false) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchRepositories(params, skipCache);
        setData(result.data);
        setRateLimit(result.rateLimit);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
        setError(errorMessage);
        setData(null);

        // Log error for debugging (only in development)
        if (import.meta.env.DEV) {
          console.error('Fetch error:', err);
        }
      } finally {
        setLoading(false);
      }
    },
    [params]
  );

  // Debounced effect for filter changes (excluding page)
  useDebounce(() => fetchRepos(), 400, [
    params.days,
    params.stars,
    params.language,
    params.dateType,
    params.startDate,
    params.endDate,
  ]);

  // Immediate effect for pagination (no debounce)
  useEffect(() => {
    fetchRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page]);

  // Initial fetch on mount
  useEffect(() => {
    fetchRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    data,
    loading,
    error,
    rateLimit,
    refetch: () => fetchRepos(true),
  };
}
