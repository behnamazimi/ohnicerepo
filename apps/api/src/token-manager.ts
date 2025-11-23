import type { UpstashRedis } from './redis';
import type { Env, RateLimitInfo, TokenStatus } from './types';
import { fetchCurrentRateLimit } from './github-api';

export const LOW_RATE_LIMIT_THRESHOLD = 50; // Warn when total remaining requests across all tokens is below this

// Token Manager class for managing multiple GitHub tokens
export class TokenManager {
  private tokens: Array<{ token: string; id: string }>;
  private redis: UpstashRedis | null;

  constructor(env: Env, redis: UpstashRedis | null) {
    this.redis = redis;
    this.tokens = [];

    // Parse tokens from GITHUB_TOKENS (comma-separated list)
    if (!env.GITHUB_TOKENS) {
      throw new Error('GITHUB_TOKENS is required. Set it as a comma-separated list of GitHub tokens.');
    }

    if (typeof env.GITHUB_TOKENS !== 'string') {
      throw new Error('GITHUB_TOKENS must be a string containing comma-separated tokens.');
    }

    // Remove surrounding quotes if present (common in .env files)
    let tokensValue = env.GITHUB_TOKENS.trim();
    if (
      (tokensValue.startsWith('"') && tokensValue.endsWith('"')) ||
      (tokensValue.startsWith("'") && tokensValue.endsWith("'"))
    ) {
      tokensValue = tokensValue.slice(1, -1);
    }

    const tokenList = tokensValue
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokenList.length === 0) {
      throw new Error('GITHUB_TOKENS contains no valid tokens. Provide at least one token separated by commas.');
    }

    tokenList.forEach((token, index) => {
      this.tokens.push({ token, id: `token_${index}` });
    });
  }

  // Get the best available token (highest remaining requests)
  async getBestToken(): Promise<{ token: string; tokenId: string } | null> {
    if (this.tokens.length === 0) {
      return null;
    }

    // If only one token, return it
    if (this.tokens.length === 1) {
      return { token: this.tokens[0].token, tokenId: this.tokens[0].id };
    }

    // Get rate limit status for all tokens
    const statuses = await this.getAllTokenStatus();

    // Filter available tokens (remaining > 0 or reset time passed)
    const now = Math.floor(Date.now() / 1000);
    const availableTokens = statuses.filter(
      (status) => status.available && (status.remaining > 0 || status.reset <= now)
    );

    if (availableTokens.length === 0) {
      // All tokens exhausted, return the one with earliest reset time
      const sortedByReset = statuses.sort((a, b) => a.reset - b.reset);
      const earliestToken = this.tokens.find((t) => t.id === sortedByReset[0].tokenId);
      if (earliestToken) {
        return { token: earliestToken.token, tokenId: earliestToken.id };
      }
      // Fallback to first token
      return { token: this.tokens[0].token, tokenId: this.tokens[0].id };
    }

    // Sort by remaining requests (descending) and return the best one
    const sortedByRemaining = availableTokens.sort((a, b) => b.remaining - a.remaining);
    const bestToken = this.tokens.find((t) => t.id === sortedByRemaining[0].tokenId);
    if (bestToken) {
      return { token: bestToken.token, tokenId: bestToken.id };
    }

    // Fallback to first token
    return { token: this.tokens[0].token, tokenId: this.tokens[0].id };
  }

  // Update rate limit info for a token after API call
  async updateTokenRateLimit(tokenId: string, rateLimit: RateLimitInfo): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const key = `github:ratelimit:${tokenId}`;
      const ttl = Math.max(0, rateLimit.reset - Math.floor(Date.now() / 1000));
      await this.redis.setJson(key, rateLimit, { ex: ttl > 0 ? ttl : 3600 });
    } catch (error) {
      console.error(`Failed to update rate limit for token ${tokenId}:`, error);
    }
  }

  // Get rate limit status for all tokens
  async getAllTokenStatus(): Promise<TokenStatus[]> {
    const statuses: TokenStatus[] = [];

    for (const tokenInfo of this.tokens) {
      try {
        const rateLimit = await this.fetchTokenRateLimit(tokenInfo.token);
        const now = Math.floor(Date.now() / 1000);
        const available = rateLimit.remaining > 0 || rateLimit.reset <= now;

        statuses.push({
          tokenId: tokenInfo.id,
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          reset: rateLimit.reset,
          available,
        });

        // Update Redis cache
        if (this.redis) {
          await this.updateTokenRateLimit(tokenInfo.id, rateLimit);
        }
      } catch (error) {
        console.error(`Failed to fetch rate limit for token ${tokenInfo.id}:`, error);
        // Add default status for failed tokens
        statuses.push({
          tokenId: tokenInfo.id,
          remaining: 0,
          limit: 5000,
          reset: Math.floor(Date.now() / 1000) + 3600,
          available: false,
        });
      }
    }

    return statuses;
  }

  // Fetch rate limit from GitHub API for a specific token
  private async fetchTokenRateLimit(token: string): Promise<RateLimitInfo> {
    try {
      const rateLimitResponse = await fetch('https://api.github.com/rate_limit', {
        headers: {
          Authorization: `token ${token}`,
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

        const searchLimit = rateLimitData.resources.search;
        return {
          remaining: searchLimit.remaining,
          limit: searchLimit.limit,
          reset: searchLimit.reset,
        };
      }

      // Fallback to headers
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
      console.error('Error fetching rate limit:', error);
      // Return default values if rate limit fetch fails
      return {
        remaining: 0,
        limit: 5000,
        reset: Math.floor(Date.now() / 1000) + 3600,
      };
    }
  }

  // Get cached rate limit from Redis
  async getCachedRateLimit(tokenId: string): Promise<RateLimitInfo | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const key = `github:ratelimit:${tokenId}`;
      return await this.redis.getJson<RateLimitInfo>(key);
    } catch (error) {
      return null;
    }
  }

  // Get total remaining requests across all tokens
  async getTotalRemaining(): Promise<number> {
    const statuses = await this.getAllTokenStatus();
    return statuses.reduce((sum, status) => sum + Math.max(0, status.remaining), 0);
  }

  // Get total limit across all tokens
  async getTotalLimit(): Promise<number> {
    const statuses = await this.getAllTokenStatus();
    return statuses.reduce((sum, status) => sum + status.limit, 0);
  }

  // Get earliest reset time across all tokens
  async getEarliestReset(): Promise<number> {
    const statuses = await this.getAllTokenStatus();
    if (statuses.length === 0) return Math.floor(Date.now() / 1000) + 3600;
    return Math.min(...statuses.map((s) => s.reset));
  }
}

