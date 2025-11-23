# OhNiceRepo!

A web app to discover trending GitHub repositories. Find repositories created within a specific time period that have more than X stars, filtered by programming language. 


## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Fastify + TypeScript
- **Styling**: Custom CSS with CSS variables
- **State Management**: React Hooks

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- GitHub Personal Access Token

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ohnicerepo.git
cd ohnicerepo
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd backend
npm install
cd ..
```

4. Create a `.env` file in the `backend` directory:
```bash
cd backend
echo "GITHUB_TOKEN=your_github_token_here" > .env
cd ..
```

5. Start the development servers:

**Start the frontend (client):**
```bash
npm run dev
```

**Start the backend (in a separate terminal):**
```bash
cd backend
npm run dev
```

This will start:
- Frontend on `http://localhost:5173`
- Backend on `http://localhost:3001`

## Usage

1. Select a date range (e.g., "7 days ago")
2. Set minimum stars (default: 100)
3. Optionally filter by programming language
4. Browse the results and use pagination to see more

## Project Structure

```
ohnicerepo/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API service layer
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript types
│   └── constants/          # Constants and configuration
├── backend/                # Backend server
│   └── index.ts            # Fastify server
└── package.json            # Frontend dependencies
```

## License

MIT
