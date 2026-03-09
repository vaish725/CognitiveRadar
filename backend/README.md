# Backend

Python backend for Cognitive Radar built with FastAPI.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On macOS/Linux
```

2. Install dependencies:
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run development server:
```bash
python main.py
```

API will be available at http://localhost:8000

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/           # API v1 endpoints
│   ├── core/             # Core configuration
│   ├── models/           # Data models
│   ├── services/         # Business logic
│   └── utils/            # Utility functions
├── tests/                # Test files
├── main.py               # Application entry point
└── requirements.txt      # Dependencies
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc
