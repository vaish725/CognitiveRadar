from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.rate_limiter import rate_limit_middleware
from app.api.v1.router import api_router

setup_logging()
logger = get_logger(__name__)

app = FastAPI(
    title="Cognitive Radar API",
    description="Transform conversations into evolving knowledge graphs",
    version="1.0.0",
    docs_url=f"/api/{settings.api_version}/docs",
    redoc_url=f"/api/{settings.api_version}/redoc",
    openapi_url=f"/api/{settings.api_version}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(rate_limit_middleware)

app.include_router(api_router, prefix=f"/api/{settings.api_version}")


@app.on_event("startup")
async def startup_event():
    logger.info("Starting Cognitive Radar API")
    logger.info(f"Environment: {settings.environment}")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down Cognitive Radar API")


@app.get("/")
async def root():
    return {
        "service": "Cognitive Radar API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.environment
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload
    )
