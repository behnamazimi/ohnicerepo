import type { RateLimitInfo } from './types';

// Helper function to fetch current rate limit from GitHub
export async function fetchCurrentRateLimit(githubToken: string): Promise<RateLimitInfo> {
  try {
    const rateLimitResponse = await fetch('https://api.github.com/rate_limit', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ohnicerepo-app',
      },
    });

    if (rateLimitResponse.ok) {
      const rateLimitData = (await rateLimitResponse.json()) as {
        resources: {
          search: {
            remaining: number;
            limit: number;
            reset: number;
          };
          core: {
            remaining: number;
            limit: number;
            reset: number;
          };
        };
      };

      // Use search rate limit if available, otherwise use core
      const searchLimit = rateLimitData.resources.search;
      return {
        remaining: searchLimit.remaining,
        limit: searchLimit.limit,
        reset: searchLimit.reset,
      };
    }

    // Fallback to headers if JSON parsing fails
    const rateLimitRemaining = parseInt(
      rateLimitResponse.headers.get('x-ratelimit-remaining') || '0',
      10
    );
    const rateLimitLimit = parseInt(
      rateLimitResponse.headers.get('x-ratelimit-limit') || '5000',
      10
    );
    const rateLimitReset = parseInt(
      rateLimitResponse.headers.get('x-ratelimit-reset') || '0',
      10
    );

    return {
      remaining: rateLimitRemaining,
      limit: rateLimitLimit,
      reset: rateLimitReset,
    };
  } catch (error) {
    // Return default values if rate limit fetch fails
    return {
      remaining: 0,
      limit: 5000,
      reset: Math.floor(Date.now() / 1000) + 3600,
    };
  }
}

