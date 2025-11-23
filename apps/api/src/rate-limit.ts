import type { UpstashRedis } from './redis';
import type { RateLimitResult } from './types';

export const RATE_LIMIT_MAX = 100; // Maximum 100 requests
export const RATE_LIMIT_WINDOW = 60; // 1 minute in seconds (for Redis TTL)

// Get client identifier (IP address or sessionID)
export function getClientIdentifier(request: Request): string {
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
export async function checkRateLimit(
  redis: UpstashRedis,
  clientId: string
): Promise<RateLimitResult> {
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
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX - 1,
      resetTime: (now + RATE_LIMIT_WINDOW) * 1000,
    };
  }
}

