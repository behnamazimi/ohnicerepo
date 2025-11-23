import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimitPlugin from '@fastify/rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

// Cache configuration
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // 10 minutes in ms
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Generate cache key from query parameters
function generateCacheKey(params: {
  days: number;
  stars: number;
  page: number;
  perPage: number;
  language: string;
  dateType: string;
}): string {
  return `${params.days}-${params.stars}-${params.page}-${params.perPage}-${params.language}-${params.dateType}`;
}

// Clean expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

interface RepoQuery {
  days?: string;
  stars?: string;
  page?: string;
  perPage?: string;
  language?: string;
  dateType?: string; // 'exact' or 'after'
}

fastify.get<{ Querystring: RepoQuery }>('/api/repos', async (request, reply) => {
  const { 
    days = '7', 
    stars = '100', 
    page = '1', 
    perPage = '100',
    language = '',
    dateType = 'after'
  } = request.query;

  const daysNum = parseInt(days, 10);
  const starsNum = parseInt(stars, 10);
  const pageNum = parseInt(page, 10);
  const perPageNum = parseInt(perPage, 10);

  if (isNaN(daysNum) || isNaN(starsNum) || isNaN(pageNum) || isNaN(perPageNum)) {
    return reply.status(400).send({ error: 'Invalid query parameters' });
  }

  if (daysNum < 0 || starsNum < 0 || pageNum < 1 || perPageNum < 1 || perPageNum > 100) {
    return reply.status(400).send({ error: 'Invalid parameter values' });
  }

  if (dateType !== 'exact' && dateType !== 'after') {
    return reply.status(400).send({ error: 'Invalid dateType. Must be "exact" or "after"' });
  }

  // Calculate the date n days ago
  const date = new Date();
  date.setDate(date.getDate() - daysNum);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Build GitHub search query
  let queryParts: string[] = [];
  
  // Date filter
  if (dateType === 'exact') {
    queryParts.push(`created:${dateStr}`);
  } else {
    queryParts.push(`created:>${dateStr}`);
  }
  
  // Stars filter
  queryParts.push(`stars:>${starsNum}`);
  
  // Language filter
  if (language && language.trim()) {
    queryParts.push(`language:${encodeURIComponent(language.trim())}`);
  }
  
  const query = queryParts.join(' ');
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    return reply.status(500).send({ error: 'GitHub token not configured' });
  }

  // Generate cache key
  const cacheKey = generateCacheKey({
    days: daysNum,
    stars: starsNum,
    page: pageNum,
    perPage: perPageNum,
    language: language || '',
    dateType: dateType,
  });

  // Check cache
  const cachedEntry = cache.get(cacheKey);
  const now = Date.now();
  if (cachedEntry && (now - cachedEntry.timestamp) < cachedEntry.ttl) {
    fastify.log.info(`Cache hit for key: ${cacheKey}`);
    return cachedEntry.data;
  }

  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&page=${pageNum}&per_page=${perPageNum}`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'ohnicerepo-app',
        },
      }
    );

    // Parse rate limit headers
    const rateLimitRemaining = parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10);
    const rateLimitLimit = parseInt(response.headers.get('x-ratelimit-limit') || '5000', 10);
    const rateLimitReset = parseInt(response.headers.get('x-ratelimit-reset') || '0', 10);

    if (!response.ok) {
      if (response.status === 403) {
        return reply.status(403).send({
          error: 'GitHub API rate limit exceeded',
          rateLimit: {
            remaining: rateLimitRemaining,
            limit: rateLimitLimit,
            reset: rateLimitReset,
          },
        });
      }
      const errorText = await response.text();
      return reply.status(response.status).send({
        error: 'GitHub API error',
        details: errorText,
        rateLimit: {
          remaining: rateLimitRemaining,
          limit: rateLimitLimit,
          reset: rateLimitReset,
        },
      });
    }

    const data = await response.json() as {
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

    // Store in cache
    cache.set(cacheKey, {
      data: responseData,
      timestamp: now,
      ttl: CACHE_TTL,
    });

    fastify.log.info(`Cache miss for key: ${cacheKey}, stored in cache`);

    return responseData;
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      error: 'Failed to fetch repositories',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

const start = async () => {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: true,
    });

    // Register rate limiting to protect backend
    await fastify.register(rateLimitPlugin, {
      max: 100, // Maximum 100 requests
      timeWindow: 60 * 1000, // 1 minute in milliseconds
    });

    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Server listening on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

