// Upstash Redis REST API client (Workers-compatible)
// Uses Upstash REST API format: https://docs.upstash.com/redis/features/restapi
class UpstashRedis {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    // Ensure URL doesn't end with /
    this.url = url.endsWith('/') ? url.slice(0, -1) : url;
    this.token = token;
  }

  private async executeCommand(command: string[]): Promise<any> {
    const response = await fetch(`${this.url}/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Redis command failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as { result: any };
    return data.result;
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await this.executeCommand(['GET', key]);
    if (result === null) {
      return null;
    }
    // Upstash returns numbers as strings, so parse if needed
    if (typeof result === 'string' && /^-?\d+$/.test(result)) {
      return parseInt(result, 10) as T;
    }
    return result as T;
  }

  async set(key: string, value: number, options?: { ex?: number }): Promise<void> {
    const command: string[] = ['SET', key, value.toString()];
    if (options?.ex) {
      command.push('EX', options.ex.toString());
    }
    await this.executeCommand(command);
  }

  async incr(key: string): Promise<number> {
    const result = await this.executeCommand(['INCR', key]);
    return typeof result === 'number' ? result : parseInt(result, 10);
  }

  async ttl(key: string): Promise<number> {
    const result = await this.executeCommand(['TTL', key]);
    return typeof result === 'number' ? result : parseInt(result, 10);
  }
}

// Cloudflare Workers environment interface
interface Env {
  GITHUB_TOKEN: string;
  ALLOWED_ORIGINS?: string; // Comma-separated list of allowed origins
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

const RATE_LIMIT_MAX = 100; // Maximum 100 requests
const RATE_LIMIT_WINDOW = 60; // 1 minute in seconds (for Redis TTL)

// Get client identifier (IP address or sessionID)
function getClientIdentifier(request: Request): string {
  // Check for sessionID in header first
  const sessionID = request.headers.get('X-Session-ID') || request.headers.get('Session-ID');

  if (sessionID) {
    return `session:${sessionID}`;
  }

  // Check for sessionID in cookie
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    if (cookies.sessionID || cookies.session_id) {
      return `session:${cookies.sessionID || cookies.session_id}`;
    }
  }

  // Fall back to IP address
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';

  return `ip:${ip}`;
}

// Rate limiting function using Upstash Redis
// Optimized to minimize Redis calls: uses INCR first, then conditionally sets TTL
async function checkRateLimit(
  redis: UpstashRedis,
  clientId: string
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const key = `ratelimit:${clientId}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    // Optimize: Use INCR first (creates key if doesn't exist, returns new count)
    const newCount = await redis.incr(key);

    // If this is the first request (count = 1), set TTL
    if (newCount === 1) {
      await redis.set(key, 1, { ex: RATE_LIMIT_WINDOW });
    }

    // Check if rate limit exceeded
    if (newCount > RATE_LIMIT_MAX) {
      // Only get TTL if we need to know when it resets
      const ttl = await redis.ttl(key);
      const resetTime = now + (ttl > 0 ? ttl : RATE_LIMIT_WINDOW);

      return {
        allowed: false,
        remaining: 0,
        resetTime: resetTime * 1000, // Convert to milliseconds
      };
    }

    // Calculate reset time (current time + window, or use TTL if available)
    // For efficiency, we'll estimate based on window since we don't need exact TTL for allowed requests
    const resetTime = (now + RATE_LIMIT_WINDOW) * 1000; // Convert to milliseconds

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX - newCount,
      resetTime,
    };
  } catch (error) {
    // If Redis fails, allow the request but log the error
    // In production, you might want to be more strict here
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX - 1,
      resetTime: (now + RATE_LIMIT_WINDOW) * 1000,
    };
  }
}

// CORS helper function
function getCorsHeaders(origin: string | null, allowedOrigins: string[]): Headers {
  const headers = new Headers();

  // Check if origin is allowed
  const isAllowed =
    origin &&
    (allowedOrigins.includes(origin) ||
      allowedOrigins.some((allowed) => {
        if (allowed.startsWith('http://localhost')) {
          return origin.startsWith('http://localhost');
        }
        return origin === allowed;
      }));

  if (isAllowed) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return headers;
}

// Parse allowed origins from environment
function getAllowedOrigins(env: Env): string[] {
  if (env.ALLOWED_ORIGINS) {
    return env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
  }
  // Default: allow localhost for development
  return ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];
}

interface RepoQuery {
  days?: string;
  stars?: string;
  page?: string;
  perPage?: string;
  language?: string;
  dateType?: string; // 'exact', 'after', or 'range'
  startDate?: string; // YYYY-MM-DD format for range start
  endDate?: string; // YYYY-MM-DD format for range end
}

// Helper function to fetch current rate limit from GitHub
async function fetchCurrentRateLimit(githubToken: string): Promise<{
  remaining: number;
  limit: number;
  reset: number;
}> {
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
    const rateLimitReset = parseInt(rateLimitResponse.headers.get('x-ratelimit-reset') || '0', 10);

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

// Create JSON response helper
function jsonResponse(data: any, status: number = 200, headers?: Headers): Response {
  const responseHeaders = headers || new Headers();
  responseHeaders.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });
}

// Main request handler
async function handleRequest(request: Request, env: Env): Promise<Response> {
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
      // In production, you might want to fail here instead
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
    return handleReposRequest(url, env, corsHeaders);
  }

  // 404 for unknown routes
  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

// Handle /api/repos requests
async function handleReposRequest(url: URL, env: Env, corsHeaders: Headers): Promise<Response> {
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

  // Check GitHub token
  if (!env.GITHUB_TOKEN) {
    return jsonResponse({ error: 'GitHub token not configured' }, 500, corsHeaders);
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

  try {
    // Fetch current rate limit first
    const currentRateLimit = await fetchCurrentRateLimit(env.GITHUB_TOKEN);

    // Fetch repositories from GitHub
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&page=${pageNum}&per_page=${perPageNum}`,
      {
        headers: {
          Authorization: `token ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'ohnicerepo-app',
        },
      }
    );

    // Parse rate limit headers from GitHub response
    const rateLimitRemaining = parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10);
    const rateLimitLimit = parseInt(response.headers.get('x-ratelimit-limit') || '5000', 10);
    const rateLimitReset = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10);

    if (!response.ok) {
      if (response.status === 403) {
        return jsonResponse(
          {
            error: 'GitHub API rate limit exceeded',
            rateLimit: {
              remaining: rateLimitRemaining,
              limit: rateLimitLimit,
              reset: rateLimitReset,
            },
          },
          403,
          corsHeaders
        );
      }

      const errorText = await response.text();
      return jsonResponse(
        {
          error: 'GitHub API error',
          details: errorText,
          rateLimit: {
            remaining: rateLimitRemaining,
            limit: rateLimitLimit,
            reset: rateLimitReset,
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
        remaining: rateLimitRemaining,
        limit: rateLimitLimit,
        reset: rateLimitReset,
      },
    };

    return jsonResponse(responseData, 200, corsHeaders);
  } catch (error) {
    // Log error (Cloudflare Workers will capture this)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return jsonResponse(
      {
        error: 'Failed to fetch repositories',
        message: 'An internal error occurred. Please try again later.',
      },
      500,
      corsHeaders
    );
  }
}

// Cloudflare Workers entry point
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      // Global error handler with better logging
      console.error('Global error handler caught:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }

      // Safely check environment variables
      try {
        if (!env?.GITHUB_TOKEN) {
          console.error('Missing GITHUB_TOKEN in environment');
        }
        if (!env?.UPSTASH_REDIS_REST_URL) {
          console.error('Missing UPSTASH_REDIS_REST_URL in environment');
        }
        if (!env?.UPSTASH_REDIS_REST_TOKEN) {
          console.error('Missing UPSTASH_REDIS_REST_TOKEN in environment');
        }
      } catch (envError) {
        console.error('Error checking environment:', envError);
      }

      // Safely get CORS headers
      let corsHeaders: Headers;
      try {
        const origin = request.headers.get('Origin');
        const allowedOrigins = env ? getAllowedOrigins(env) : ['http://localhost:5173'];
        corsHeaders = getCorsHeaders(origin, allowedOrigins);
      } catch (corsError) {
        console.error('Error setting up CORS headers:', corsError);
        corsHeaders = new Headers();
        corsHeaders.set('Content-Type', 'application/json');
      }

      return jsonResponse(
        {
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred.',
        },
        500,
        corsHeaders
      );
    }
  },
};
