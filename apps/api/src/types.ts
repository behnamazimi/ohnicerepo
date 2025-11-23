// Cloudflare Workers environment interface
export interface Env {
  GITHUB_TOKENS?: string; // Comma-separated list of tokens
  ALLOWED_ORIGINS?: string; // Comma-separated list of allowed origins
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

// Rate limit information structure
export interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset: number;
}

// Token status structure
export interface TokenStatus {
  tokenId: string;
  remaining: number;
  limit: number;
  reset: number;
  available: boolean;
}

// Repository query parameters
export interface RepoQuery {
  days?: string;
  stars?: string;
  page?: string;
  perPage?: string;
  language?: string;
  dateType?: string; // 'exact', 'after', or 'range'
  startDate?: string; // YYYY-MM-DD format for range start
  endDate?: string; // YYYY-MM-DD format for range end
}

// Rate limit check result
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

