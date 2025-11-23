import type { Env } from './src/types';
import { handleRequest } from './src/handlers';
import { getCorsHeaders, getAllowedOrigins } from './src/cors';
import { jsonResponse } from './src/utils';

// Cloudflare Workers entry point
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      // Global error handler
      console.error('Global error handler caught:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }

      // Safely check environment variables
      try {
        if (!env?.GITHUB_TOKENS) {
          console.error(
            'Missing GITHUB_TOKENS in environment. Set GITHUB_TOKENS as a comma-separated list of tokens.'
          );
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
