# CognitiveRadar

A modern, AI-powered knowledge graph and visualization platform built with React, TypeScript, and Vite.

## Overview

CognitiveRadar is an intelligent web application that helps users organize, visualize, and explore complex ideas and concepts through an interactive knowledge graph. It leverages AI to extract relationships, identify patterns, and provide insights from various data sources.

## Features

- **Interactive Knowledge Graph**: Visualize ideas and their relationships in real-time
- **AI-Powered Extraction**: Automatically extract concepts, claims, and relationships from text
- **Real-time Collaboration**: Supabase-backed real-time updates and synchronization
- **Multi-source Integration**: Support for text, URLs, and various content formats
- **Advanced Analytics**: Gain insights through pattern detection and relationship analysis
- **Responsive Design**: Beautiful UI that works on desktop and mobile devices
- **Dark Mode Support**: Theme toggle for comfortable viewing in any environment

## Tech Stack

### Frontend
- **React 18+** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **D3.js** - Data visualization
- **Shadcn/ui** - High-quality React components
- **Supabase** - Backend as a Service

### Backend
- Python (FastAPI) - High-performance backend API
- PostgreSQL/Supabase - Data storage
- Redis - Caching and real-time updates

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Bun (optional, but recommended)
- Python 3.9+ (for backend)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd idea-weaver
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

4. Start the development server:
```bash
npm run dev
# or
bun dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
├── src/
│   ├── components/        # React components
│   │   ├── AnimatedGraph.tsx      # D3.js graph visualization
│   │   ├── KnowledgeGraph.tsx     # Graph container
│   │   ├── NodeDetailPanel.tsx    # Node details display
│   │   ├── ThemeToggle.tsx        # Theme switcher
│   │   └── ui/                    # Shadcn/ui components
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   ├── lib/               # Utility functions
│   ├── App.tsx            # Main application component
│   └── index.css          # Global styles
├── public/                # Static assets
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Testing & Linting
```bash
npm run test         # Run unit tests
npm run lint         # Run ESLint
```

## Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8000
```

## API Documentation

The backend API is documented using OpenAPI/Swagger. When running the backend server, visit `/docs` for interactive API documentation.

### Key Endpoints

- `POST /api/extract/text` - Extract concepts and relationships from text
- `POST /api/graph/nodes` - Create graph nodes
- `POST /api/graph/edges` - Create relationships between nodes
- `GET /api/graph/nodes` - Retrieve graph nodes
- `GET /api/insights` - Get AI-generated insights

## Database Schema

### Supabase Tables

- `nodes` - Graph nodes representing concepts, claims, etc.
- `edges` - Relationships between nodes
- `insights` - Generated insights and analysis
- `users` - User profiles and preferences

## Contributing

Contributions are welcome! Please follow these steps:

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## Code Style

- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Write meaningful commit messages
- Add comments for complex logic

## Performance Considerations

- Components are optimized with React.memo and useCallback
- Graph visualization uses D3.js with efficient rendering
- Real-time updates are batched for performance
- Pagination is implemented for large datasets

## Browser Support

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Common Issues

**Issue**: Dev server not starting
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

**Issue**: Supabase connection errors
- Verify `.env.local` variables are correct
- Check Supabase project is active
- Ensure API key has proper permissions

## Performance Optimization

- Code splitting with dynamic imports
- Image optimization with WebP format
- CSS minification and optimization
- Bundle analysis available via `npm run analyze`

## Security

- All API requests are authenticated via Supabase
- Environment variables are never committed
- XSS protection through React's built-in sanitization
- CSRF tokens for state-changing operations

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the development team
- Check documentation in `/docs`

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.


---

**Last Updated**: April 2026
**Version**: 2.0.0
