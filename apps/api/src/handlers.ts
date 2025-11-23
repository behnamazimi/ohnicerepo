import { UpstashRedis } from './redis';
import type { Env, RepoQuery } from './types';
import { TokenManager, LOW_RATE_LIMIT_THRESHOLD } from './token-manager';
import { checkRateLimit, getClientIdentifier, RATE_LIMIT_MAX } from './rate-limit';
import { getCorsHeaders, getAllowedOrigins } from './cors';
import { deduplicateRequest } from './deduplication';
import { jsonResponse } from './utils';

// Main request handler
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);
  const corsHeaders = getCorsHeaders(origin, allowedOrigins);

  // Handle OPTIONS preflight requests early (no Redis needed)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow GET requests (no Redis needed for method validation)
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  // Only initialize Redis and check rate limits if Redis is configured
  // This makes Redis optional - if not configured, we skip rate limiting
  const hasRedisConfig = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

  if (hasRedisConfig) {
    // Initialize Redis client only when needed
    let redis: UpstashRedis | null = null;
    try {
      redis = new UpstashRedis(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      // If Redis initialization fails, continue without rate limiting
    }

    // Get client identifier (IP or sessionID) and check rate limit
    if (redis) {
      const clientId = getClientIdentifier(request);
      const rateLimit = await checkRateLimit(redis, clientId);

      if (!rateLimit.allowed) {
        corsHeaders.set('X-RateLimit-Limit', RATE_LIMIT_MAX.toString());
        corsHeaders.set('X-RateLimit-Remaining', '0');
        corsHeaders.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString());
        corsHeaders.set(
          'Retry-After',
          Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
        );

        return jsonResponse(
          { error: 'Rate limit exceeded. Please try again later.' },
          429,
          corsHeaders
        );
      }

      // Add rate limit headers to successful responses
      corsHeaders.set('X-RateLimit-Limit', RATE_LIMIT_MAX.toString());
      corsHeaders.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      corsHeaders.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000).toString());
    }
  }

  // Handle /api/repos endpoint
  if (url.pathname === '/api/repos') {
    // Initialize Redis if available
    let redis: UpstashRedis | null = null;
    if (hasRedisConfig) {
      try {
        redis = new UpstashRedis(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
      } catch (error) {
        console.error('Failed to initialize Redis for repos request:', error);
      }
    }
    return handleReposRequest(url, env, corsHeaders, redis);
  }

  // 404 for unknown routes
  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

// Handle /api/repos requests
async function handleReposRequest(
  url: URL,
  env: Env,
  corsHeaders: Headers,
  redis: UpstashRedis | null
): Promise<Response> {
  // Parse query parameters
  const daysParam = url.searchParams.get('days') || '7';
  const starsParam = url.searchParams.get('stars') || '100';
  const pageParam = url.searchParams.get('page') || '1';
  const perPageParam = url.searchParams.get('perPage') || '100';
  const languageParam = url.searchParams.get('language') || '';
  const dateTypeParam = url.searchParams.get('dateType') || 'after';
  const startDateParam = url.searchParams.get('startDate');
  const endDateParam = url.searchParams.get('endDate');

  const params: RepoQuery = {
    days: daysParam,
    stars: starsParam,
    page: pageParam,
    perPage: perPageParam,
    language: languageParam,
    dateType: dateTypeParam,
    startDate: startDateParam || undefined,
    endDate: endDateParam || undefined,
  };

  // Validate and parse numeric parameters
  const daysNum = parseInt(daysParam, 10);
  const starsNum = parseInt(starsParam, 10);
  const pageNum = parseInt(pageParam, 10);
  const perPageNum = parseInt(perPageParam, 10);

  if (isNaN(daysNum) || isNaN(starsNum) || isNaN(pageNum) || isNaN(perPageNum)) {
    return jsonResponse({ error: 'Invalid query parameters' }, 400, corsHeaders);
  }

  if (daysNum < 0 || starsNum < 0 || pageNum < 1 || perPageNum < 1 || perPageNum > 100) {
    return jsonResponse({ error: 'Invalid parameter values' }, 400, corsHeaders);
  }

  if (params.dateType !== 'exact' && params.dateType !== 'after' && params.dateType !== 'range') {
    return jsonResponse(
      { error: 'Invalid dateType. Must be "exact", "after", or "range"' },
      400,
      corsHeaders
    );
  }

  // Validate date range if dateType is 'range'
  if (params.dateType === 'range') {
    if (!params.startDate || !params.endDate) {
      return jsonResponse(
        { error: 'startDate and endDate are required when dateType is "range"' },
        400,
        corsHeaders
      );
    }
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(params.startDate) || !dateRegex.test(params.endDate)) {
      return jsonResponse({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400, corsHeaders);
    }
    // Validate that startDate is before endDate
    if (new Date(params.startDate) > new Date(params.endDate)) {
      return jsonResponse(
        { error: 'startDate must be before or equal to endDate' },
        400,
        corsHeaders
      );
    }
  }

  // Initialize TokenManager
  let tokenManager: TokenManager;
  try {
    tokenManager = new TokenManager(env, redis);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(
      {
        error: 'GitHub token configuration error',
        message: errorMessage,
      },
      500,
      corsHeaders
    );
  }

  // Build GitHub search query
  let queryParts: string[] = [];

  // Date filter
  if (params.dateType === 'range') {
    // Use GitHub's date range format: created:YYYY-MM-DD..YYYY-MM-DD
    queryParts.push(`created:${params.startDate}..${params.endDate}`);
  } else {
    // Calculate the date n days ago for exact/after modes
    const date = new Date();
    date.setDate(date.getDate() - daysNum);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    if (params.dateType === 'exact') {
      queryParts.push(`created:${dateStr}`);
    } else {
      queryParts.push(`created:>${dateStr}`);
    }
  }

  // Stars filter
  queryParts.push(`stars:>${starsNum}`);

  // Language filter
  if (params.language && params.language.trim()) {
    queryParts.push(`language:${encodeURIComponent(params.language.trim())}`);
  }

  const query = queryParts.join(' ');

  // Create deduplication key from query parameters
  const dedupKey = JSON.stringify({
    query,
    page: pageNum,
    perPage: perPageNum,
  });

  // Use deduplication to prevent duplicate requests
  return deduplicateRequest(redis, dedupKey, async () => {
    try {
      // Get best available token
      const tokenInfo = await tokenManager.getBestToken();
      if (!tokenInfo) {
        return jsonResponse(
          {
            error: 'No available GitHub tokens',
            message: 'All GitHub tokens are exhausted. Please try again later.',
          },
          503,
          corsHeaders
        );
      }

      // Check total remaining requests across all tokens for proactive management
      const initialTotalRemaining = await tokenManager.getTotalRemaining();
      if (initialTotalRemaining < LOW_RATE_LIMIT_THRESHOLD) {
        corsHeaders.set('X-RateLimit-Warning', 'low');
      }

      // Fetch repositories from GitHub
      const githubUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&page=${pageNum}&per_page=${perPageNum}`;

      const response = await fetch(githubUrl, {
        headers: {
          Authorization: `token ${tokenInfo.token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'ohnicerepo-app',
        },
      });

      // Parse rate limit headers from GitHub response
      const rateLimitRemaining = parseInt(
        response.headers.get('x-ratelimit-remaining') || '0',
        10
      );
      const rateLimitLimit = parseInt(response.headers.get('x-ratelimit-limit') || '5000', 10);
      const rateLimitReset = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10);

      // Update token rate limit in Redis
      await tokenManager.updateTokenRateLimit(tokenInfo.tokenId, {
        remaining: rateLimitRemaining,
        limit: rateLimitLimit,
        reset: rateLimitReset,
      });

      // Get cumulative values across all tokens
      const totalRemaining = await tokenManager.getTotalRemaining();
      const totalLimit = await tokenManager.getTotalLimit();
      const earliestReset = await tokenManager.getEarliestReset();

      if (!response.ok) {
        if (response.status === 403) {
          // Rate limit exceeded for this token, try to get another token
          const allStatuses = await tokenManager.getAllTokenStatus();
          const availableTokens = allStatuses.filter(
            (s) => s.remaining > 0 && s.tokenId !== tokenInfo.tokenId
          );

          if (availableTokens.length > 0) {
            // Try with another token
            const nextTokenInfo = await tokenManager.getBestToken();
            if (nextTokenInfo && nextTokenInfo.tokenId !== tokenInfo.tokenId) {
              // Retry with new token
              const retryResponse = await fetch(githubUrl, {
                headers: {
                  Authorization: `token ${nextTokenInfo.token}`,
                  Accept: 'application/vnd.github.v3+json',
                  'User-Agent': 'ohnicerepo-app',
                },
              });

              const retryRateLimitRemaining = parseInt(
                retryResponse.headers.get('x-ratelimit-remaining') || '0',
                10
              );
              const retryRateLimitLimit = parseInt(
                retryResponse.headers.get('x-ratelimit-limit') || '5000',
                10
              );
              const retryRateLimitReset = parseInt(
                retryResponse.headers.get('x-ratelimit-reset') || '0',
                10
              );

              await tokenManager.updateTokenRateLimit(nextTokenInfo.tokenId, {
                remaining: retryRateLimitRemaining,
                limit: retryRateLimitLimit,
                reset: retryRateLimitReset,
              });

              // Get cumulative values after retry token update
              const retryTotalRemaining = await tokenManager.getTotalRemaining();
              const retryTotalLimit = await tokenManager.getTotalLimit();
              const retryEarliestReset = await tokenManager.getEarliestReset();

              if (!retryResponse.ok) {
                // Both tokens failed
                const retryAfter = Math.max(0, retryEarliestReset - Math.floor(Date.now() / 1000));

                corsHeaders.set('Retry-After', retryAfter.toString());
                return jsonResponse(
                  {
                    error: 'GitHub API rate limit exceeded for all tokens',
                    rateLimit: {
                      remaining: retryTotalRemaining,
                      limit: retryTotalLimit,
                      reset: retryEarliestReset,
                    },
                    message: `All GitHub tokens exhausted. Retry after ${new Date(retryEarliestReset * 1000).toISOString()}`,
                  },
                  503,
                  corsHeaders
                );
              }

              // Success with retry token
              const retryData = (await retryResponse.json()) as {
                total_count: number;
                items: Array<{
                  id: number;
                  full_name: string;
                  description: string | null;
                  stargazers_count: number;
                  language: string | null;
                  html_url: string;
                  created_at: string;
                  updated_at: string;
                }>;
              };

              const retryRepos = retryData.items.map((repo) => ({
                id: repo.id,
                name: repo.full_name,
                description: repo.description,
                stars: repo.stargazers_count,
                language: repo.language,
                url: repo.html_url,
                createdAt: repo.created_at,
                updatedAt: repo.updated_at,
              }));

              const retryResponseData = {
                total: retryData.total_count,
                repos: retryRepos,
                page: pageNum,
                perPage: perPageNum,
                totalPages: Math.ceil(retryData.total_count / perPageNum),
                rateLimit: {
                  remaining: retryTotalRemaining,
                  limit: retryTotalLimit,
                  reset: retryEarliestReset,
                },
              };

              // Add rate limit status headers
              corsHeaders.set('X-GitHub-RateLimit-Remaining', retryRateLimitRemaining.toString());
              corsHeaders.set('X-GitHub-RateLimit-Limit', retryRateLimitLimit.toString());
              corsHeaders.set('X-GitHub-RateLimit-Reset', retryRateLimitReset.toString());
              corsHeaders.set('X-GitHub-Token-Id', nextTokenInfo.tokenId);

              return jsonResponse(retryResponseData, 200, corsHeaders);
            }
          }

          // All tokens exhausted - get cumulative values
          const exhaustedTotalRemaining = await tokenManager.getTotalRemaining();
          const exhaustedTotalLimit = await tokenManager.getTotalLimit();
          const exhaustedEarliestReset = await tokenManager.getEarliestReset();
          const retryAfter = Math.max(0, exhaustedEarliestReset - Math.floor(Date.now() / 1000));

          corsHeaders.set('Retry-After', retryAfter.toString());
          return jsonResponse(
            {
              error: 'GitHub API rate limit exceeded for all tokens',
              rateLimit: {
                remaining: exhaustedTotalRemaining,
                limit: exhaustedTotalLimit,
                reset: exhaustedEarliestReset,
              },
              message: `All GitHub tokens exhausted. Retry after ${new Date(exhaustedEarliestReset * 1000).toISOString()}`,
            },
            503,
            corsHeaders
          );
        }

        const errorText = await response.text();
        return jsonResponse(
          {
            error: 'GitHub API error',
            details: errorText,
            tokenId: tokenInfo.tokenId,
            rateLimit: {
              remaining: totalRemaining,
              limit: totalLimit,
              reset: earliestReset,
            },
          },
          response.status,
          corsHeaders
        );
      }

      const data = (await response.json()) as {
        total_count: number;
        items: Array<{
          id: number;
          full_name: string;
          description: string | null;
          stargazers_count: number;
          language: string | null;
          html_url: string;
          created_at: string;
          updated_at: string;
        }>;
      };

      // Transform the data to include only what we need
      const repos = data.items.map((repo) => ({
        id: repo.id,
        name: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        language: repo.language,
        url: repo.html_url,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
      }));

      const responseData = {
        total: data.total_count,
        repos,
        page: pageNum,
        perPage: perPageNum,
        totalPages: Math.ceil(data.total_count / perPageNum),
        rateLimit: {
          remaining: totalRemaining,
          limit: totalLimit,
          reset: earliestReset,
        },
      };

      // Add rate limit status headers
      corsHeaders.set('X-GitHub-RateLimit-Remaining', rateLimitRemaining.toString());
      corsHeaders.set('X-GitHub-RateLimit-Limit', rateLimitLimit.toString());
      corsHeaders.set('X-GitHub-RateLimit-Reset', rateLimitReset.toString());
      corsHeaders.set('X-GitHub-Token-Id', tokenInfo.tokenId);

      return jsonResponse(responseData, 200, corsHeaders);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in request handler:', error);

      return jsonResponse(
        {
          error: 'Failed to fetch repositories',
          message: 'An internal error occurred. Please try again later.',
          details: errorMessage,
        },
        500,
        corsHeaders
      );
    }
  }, corsHeaders);
}

