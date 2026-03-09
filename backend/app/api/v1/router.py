from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/status")
async def status():
    return {
        "status": "operational",
        "api_version": "v1"
    }
