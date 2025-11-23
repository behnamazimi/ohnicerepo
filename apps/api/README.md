# OhNiceRepo API - Cloudflare Workers

This API is deployed as a Cloudflare Worker using Wrangler.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up Wrangler (if not already done):

```bash
npx wrangler login
```

3. Set up Upstash Redis:
   - Create a Redis database at [upstash.com](https://upstash.com)
   - Get your REST URL and token from the Upstash dashboard
   - Set the secrets:

   ```bash
   wrangler secret put UPSTASH_REDIS_REST_URL
   wrangler secret put UPSTASH_REDIS_REST_TOKEN
   ```

4. Set the GitHub token as a secret:

```bash
wrangler secret put GITHUB_TOKEN
```

5. (Optional) Configure allowed CORS origins in `wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGINS = "https://yourdomain.com,http://localhost:5173"
```

## Development

### Local Testing Setup

1. Create a `.dev.vars` file in the `apps/api` directory with your local secrets:

```bash
cd apps/api
cp .dev.vars.example .dev.vars
# Then edit .dev.vars and fill in your actual values
```

The `.dev.vars` file should contain:

```
GITHUB_TOKEN=your_github_token_here
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

2. Run the worker locally:

```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

3. Test the API:

```bash
# Test the API endpoint
curl "http://localhost:8787/api/repos?days=7&stars=100&page=1&perPage=10&dateType=after"

# Test with CORS
curl -H "Origin: http://localhost:5173" "http://localhost:8787/api/repos?days=7&stars=100&page=1&perPage=10&dateType=after"

# Test OPTIONS (preflight)
curl -X OPTIONS -H "Origin: http://localhost:5173" "http://localhost:8787/api/repos"
```

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Environment Variables

### Required Secrets (set via `wrangler secret put`):

- `GITHUB_TOKEN`: GitHub personal access token
- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST API URL
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST API token

### Optional Environment Variables:

- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (defaults to localhost ports)

## API Endpoints

### GET /api/repos

Query parameters:

- `days` (default: 7): Number of days ago for date filter
- `stars` (default: 100): Minimum number of stars
- `page` (default: 1): Page number
- `perPage` (default: 100): Results per page (max 100)
- `language` (optional): Programming language filter
- `dateType` (default: 'after'): 'exact', 'after', or 'range'
- `startDate` (required if dateType='range'): Start date in YYYY-MM-DD format
- `endDate` (required if dateType='range'): End date in YYYY-MM-DD format

## Rate Limiting

The API implements rate limiting using Upstash Redis:

- 100 requests per minute per client
- Client identification priority:
  1. SessionID from `X-Session-ID` or `Session-ID` header
  2. SessionID from `sessionID` or `session_id` cookie
  3. IP address (from `CF-Connecting-IP` or `X-Forwarded-For` header)
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp when limit resets
  - `Retry-After`: Seconds to wait before retrying (when rate limited)

### Using SessionID

To use session-based rate limiting, include one of the following:

- Header: `X-Session-ID: your-session-id` or `Session-ID: your-session-id`
- Cookie: `sessionID=your-session-id` or `session_id=your-session-id`

This allows users behind the same IP (e.g., NAT) to have separate rate limits.

## Security Features

- CORS protection (configurable origins)
- Rate limiting per IP
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Input validation and sanitization
- Error handling without exposing internals
