# API Documentation

API documentation for Cognitive Radar backend.

## Base URL

Development: `http://localhost:8000/api/v1`

## Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "environment": "development"
}
```

### Status

```
GET /api/v1/status
```

Response:
```json
{
  "status": "operational",
  "api_version": "v1"
}
```

More endpoints will be added as development progresses.
