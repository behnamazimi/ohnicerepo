# OhNiceRepo Web App

React + TypeScript + Vite frontend application deployed to Cloudflare Pages.

## Setup

1. Install dependencies:

```bash
npm install
```

## Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

The app connects to the API at `https://ohnice-repo-api.bhnmzm.workers.dev` (hardcoded in the application).

## Building

Build for production:

```bash
npm run build
```

The output will be in the `dist` directory.

## Deployment to Cloudflare Pages

### Option 1: Using Wrangler CLI

1. Make sure you're logged in to Wrangler:

```bash
npx wrangler login
```

2. Deploy:

```bash
npm run deploy
```

Or manually:

```bash
npm run build
npx wrangler pages deploy dist
```

### Option 2: Using Git Integration (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket

2. In Cloudflare Dashboard:
   - Go to Pages
   - Click "Create a project"
   - Connect your Git repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
     - **Root directory**: `apps/web` (if deploying from monorepo root)

3. Deployments will happen automatically on push to your main branch

### Option 3: Direct Upload

1. Build the project:

```bash
npm run build
```

2. In Cloudflare Dashboard:
   - Go to Pages
   - Click "Create a project" > "Upload assets"
   - Upload the `dist` folder contents

## Environment Variables

The app uses the following environment variables (optional):

### PostHog Analytics

1. Create a `.env` file in the `apps/web` directory:

```bash
cd apps/web
cp .env.example .env
```

2. Edit `.env` and configure your PostHog settings:

```
VITE_PUBLIC_POSTHOG_KEY=your_posthog_key_here
VITE_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

**Note**: The `.env` file is gitignored. For production deployment on Cloudflare Pages, set these as environment variables in the Cloudflare Pages dashboard under Settings > Environment Variables.

### Accessing Environment Variables

In your code, access these variables via:

```typescript
const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
```

## API Configuration

The app connects to the API at:

- **API URL**: `https://ohnice-repo-api.bhnmzm.workers.dev` (hardcoded in the application)

## Project Structure

```
apps/web/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API service layer
│   ├── utils/          # Utility functions
│   └── App.tsx         # Main app component
├── dist/               # Build output (generated)
├── index.html          # HTML entry point
├── vite.config.ts      # Vite configuration
└── package.json        # Dependencies and scripts
```
