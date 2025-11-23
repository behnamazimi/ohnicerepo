import type { UpstashRedis } from './redis';
import { jsonResponse, hashString } from './utils';

export const DEDUP_WINDOW = 3; // 3 seconds for request deduplication

// Request deduplication: prevent duplicate API calls for identical queries
export async function deduplicateRequest(
  redis: UpstashRedis | null,
  queryKey: string,
  requestFn: () => Promise<Response>,
  corsHeaders: Headers
): Promise<Response> {
  if (!redis) {
    // No Redis, just execute the request (it will have CORS headers from requestFn)
    return requestFn();
  }

  const dedupKey = `dedup:${hashString(queryKey)}`;
  const lockKey = `${dedupKey}:lock`;
  const resultKey = `${dedupKey}:result`;

  try {
    // Check if there's a pending request
    const existingLock = await redis.exists(lockKey);
    if (existingLock) {
      // Wait for the result with retries
      let retries = 20; // Wait up to 2 seconds (20 * 100ms)
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const result = await redis.getJson<{ response: any; status: number }>(resultKey);
        if (result) {
          // Found the result, return it with CORS headers
          return jsonResponse(result.response, result.status, corsHeaders);
        }
        retries--;
      }
      // Timeout waiting for result, proceed with new request
    }

    // Set lock to indicate we're processing this request
    await redis.setJson(lockKey, { timestamp: Date.now() }, { ex: DEDUP_WINDOW });

    // Execute the request
    const response = await requestFn();
    const responseData = await response.json();

    // Store result for other waiting requests
    await redis.setJson(
      resultKey,
      { response: responseData, status: response.status },
      { ex: DEDUP_WINDOW }
    );

    // Remove lock after a short delay to allow other requests to see the result
    setTimeout(async () => {
      try {
        await redis.del(lockKey);
      } catch {
        // Ignore errors
      }
    }, 100);

    return jsonResponse(responseData, response.status, corsHeaders);
  } catch (error) {
    // If deduplication fails, just execute the request normally
    console.error('Deduplication failed:', error);
    return requestFn();
  }
}

