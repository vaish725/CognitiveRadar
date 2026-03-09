# Development Guide

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- npm or yarn
- Docker (optional)

### Local Development

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API keys
```

5. Run server:
```bash
python main.py
```

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.local.example .env.local
```

4. Run development server:
```bash
npm run dev
```

### Using Docker

Run all services with Docker Compose:

```bash
docker-compose up
```

Services will be available at:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- Firestore Emulator: http://localhost:8080

## Project Structure

```
CognitiveRadar/
├── backend/              # Python FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Core configuration
│   │   ├── models/      # Data models
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utilities
│   ├── tests/           # Backend tests
│   └── main.py          # Entry point
├── frontend/            # Next.js frontend
│   ├── app/             # Next.js app directory
│   ├── components/      # React components
│   ├── lib/             # Utilities
│   └── types/           # TypeScript types
├── docs/                # Documentation
└── docker-compose.yml   # Docker orchestration
```

## Development Workflow

1. Create feature branch
2. Implement changes
3. Test locally
4. Commit with clear message
5. Push to GitHub
6. Create pull request

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Code Style

- Python: Follow PEP 8
- TypeScript: ESLint configuration
- No emojis in code or commits
- Clear, concise commit messages
