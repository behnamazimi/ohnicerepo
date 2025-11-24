# [OhNiceRepo! - Search & Discover Nice GitHub Repositories](https://ohnicerepo.pages.dev)

A web app to discover trending GitHub repositories. Find repositories created within a specific time period that have more than X stars, filtered by programming language.

🌐 **Live Demo**: [https://ohnicerepo.pages.dev/](https://ohnicerepo.pages.dev/) 

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Fastify + TypeScript
- Monorepo: Turborepo
- Styling: Custom CSS with CSS variables
- State Management: React Hooks

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm
- GitHub Personal Access Token
- Upstash Redis account (for rate limiting)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/behnamazimi/ohnicerepo.git
cd ohnicerepo
```

2. Install all dependencies:
```bash
npm install
```

3. Set up the API environment variables:

   Create a `.dev.vars` file in the `apps/api` directory for local development:
   ```bash
   cd apps/api
   cp .dev.vars.example .dev.vars
   ```
   
   Then edit `.dev.vars` and fill in your actual values:
   ```
   GITHUB_TOKENS=first_token,second_token
   UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

   **Note**: The `.dev.vars` file is gitignored and only used for local development. For production deployment, secrets should be set using `wrangler secret put` (see [apps/api/README.md](apps/api/README.md) for details).

4. Start the development servers:

**Start all apps (frontend and backend):**
```bash
npm run dev
```

Or start them individually:

**Start the frontend:**
```bash
cd apps/web
npm run dev
```

**Start the backend (in a separate terminal):**
```bash
cd apps/api
npm run dev
```

This will start:
- Frontend on `http://localhost:5173`
- Backend API on `http://localhost:8787` (Cloudflare Worker via Wrangler)

## Available Scripts

From the root directory:

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps
- `npm run lint` - Lint all packages
- `npm run lint:check` - Check linting without auto-fix
- `npm run clean` - Clean all build artifacts and node_modules

## Usage

1. Select a date range (e.g., "7 days ago")
2. Set minimum stars (default: 100)
3. Optionally filter by programming language
4. Browse the results and use pagination to see more

## License

MIT
