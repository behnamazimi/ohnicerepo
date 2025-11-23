import type { ApiResponse, ClientCacheEntry, FilterParams, RateLimit } from '../types';
import { CLIENT_CACHE_TTL } from '../constants/cache';
import { generateClientCacheKey } from '../utils/cache';

export async function fetchRepositories(
  params: FilterParams,
  skipCache = false
): Promise<{ data: ApiResponse; rateLimit: RateLimit | null }> {
  const cacheKey = generateClientCacheKey(params);

  // Check client-side cache first (unless skipCache is true)
  if (!skipCache) {
    try {
      const cachedStr = sessionStorage.getItem(cacheKey);
      if (cachedStr) {
        const cached: ClientCacheEntry = JSON.parse(cachedStr);
        const now = Date.now();
        if (now - cached.timestamp < cached.ttl) {
          return {
            data: cached.data,
            rateLimit: cached.data.rateLimit || null,
          };
        } else {
          // Remove expired cache entry
          sessionStorage.removeItem(cacheKey);
        }
      }
    } catch {
      // Ignore cache errors
    }
  }

  // Build query parameters
  const queryParams = new URLSearchParams({
    days: params.days.toString(),
    stars: params.stars.toString(),
    page: params.page.toString(),
    perPage: params.perPage.toString(),
    dateType: params.dateType,
  });
  if (params.language.trim()) {
    queryParams.append('language', params.language.trim());
  }

  // Add timeout to fetch request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  let response: Response;
  try {
    response = await fetch(`/api/repos?${queryParams.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (fetchError) {
    clearTimeout(timeoutId);
    
    // Handle different types of network errors
    if (fetchError instanceof Error) {
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: The server took too long to respond. Please try again.');
      }
      if (fetchError.message.includes('ECONNREFUSED') || fetchError.message.includes('Failed to fetch')) {
        throw new Error('Connection error: Backend server is not running. Please ensure the server is started on port 3001.');
      }
      if (fetchError.message.includes('NetworkError') || fetchError.message.includes('network')) {
        throw new Error('Network error: Please check your internet connection and try again.');
      }
      throw new Error(`Network error: ${fetchError.message}`);
    }
    throw new Error('An unknown network error occurred');
  }

  if (!response.ok) {
    let errorMessage = 'Failed to fetch repositories';
    let rateLimitInfo: RateLimit | null = null;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        // Extract rate limit info from error response if available
        if (errorData.rateLimit) {
          rateLimitInfo = errorData.rateLimit;
        }
      } else {
        const text = await response.text();
        if (text) {
          errorMessage = text;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
    } catch {
      // If JSON parsing fails, use status text
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    // Provide more specific error messages based on status code
    if (response.status === 503 || response.status === 502) {
      errorMessage = 'Service unavailable: The server is temporarily down. Please try again later.';
    } else if (response.status === 504) {
      errorMessage = 'Gateway timeout: The server took too long to respond. Please try again.';
    } else if (response.status === 429) {
      errorMessage = rateLimitInfo 
        ? `Rate limit exceeded. Please try again after ${new Date(rateLimitInfo.reset * 1000).toLocaleTimeString()}`
        : 'Rate limit exceeded. Please try again later.';
    }

    throw new Error(errorMessage);
  }
  
  // Check if response has content before parsing
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Invalid response format from server');
  }
  
  let result: ApiResponse;
  try {
    const text = await response.text();
    if (!text || text.trim() === '') {
      throw new Error('Empty response from server');
    }
    result = JSON.parse(text);
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      throw new Error('Invalid JSON response from server. The server may be experiencing issues.');
    }
    throw parseError;
  }
  
  // Store in client cache
  try {
    const cacheEntry: ClientCacheEntry = {
      data: result,
      timestamp: Date.now(),
      ttl: CLIENT_CACHE_TTL,
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }

  return {
    data: result,
    rateLimit: result.rateLimit || null,
  };
}

