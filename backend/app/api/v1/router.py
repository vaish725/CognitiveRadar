from fastapi import APIRouter
from app.api.v1.endpoints import sessions, graphs

api_router = APIRouter()

api_router.include_router(sessions.router)
api_router.include_router(graphs.router)


@api_router.get("/status")
async def status():
    return {
        "status": "operational",
        "api_version": "v1"
    }
