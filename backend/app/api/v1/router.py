from fastapi import APIRouter
from app.api.v1.endpoints import sessions, graphs, input, extraction, query, thinking, stream

api_router = APIRouter()

api_router.include_router(sessions.router)
api_router.include_router(graphs.router)
api_router.include_router(input.router)
api_router.include_router(extraction.router)
api_router.include_router(query.router)
api_router.include_router(thinking.router)
api_router.include_router(stream.router)


@api_router.get("/status")
async def status():
    return {
        "status": "operational",
        "api_version": "v1"
    }
