import type { Env } from './types';

// CORS helper function
export function getCorsHeaders(origin: string | null, allowedOrigins: string[]): Headers {
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
export function getAllowedOrigins(env: Env): string[] {
  if (env.ALLOWED_ORIGINS) {
    return env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
  }
  // Default: allow localhost for development
  return ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];
}

