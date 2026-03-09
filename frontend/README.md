# Frontend

Next.js frontend for Cognitive Radar.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

3. Run development server:
```bash
npm run dev
```

Application will be available at http://localhost:3000

## Project Structure

```
frontend/
├── app/                  # Next.js app directory
├── components/
│   ├── graph/           # Graph visualization components
│   ├── panels/          # Panel components (transcript, insights, timeline)
│   └── ui/              # Reusable UI components
├── context/             # React context providers
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and API clients
├── types/               # TypeScript type definitions
└── public/              # Static assets
```

## Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- D3.js for graph visualization
- WebSocket for real-time updates
