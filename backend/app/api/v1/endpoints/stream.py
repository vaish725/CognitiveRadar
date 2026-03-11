from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from app.services.integration_orchestrator import integration_orchestrator
from app.services.stream_processor import stream_processor

router = APIRouter(prefix="/stream", tags=["stream"])


class StreamProcessRequest(BaseModel):
    text: str
    input_type: str = "text"


class BatchStreamRequest(BaseModel):
    texts: List[str]


@router.post("/{session_id}/process")
async def process_with_streaming(session_id: str, request: StreamProcessRequest):
    """Process input with real-time streaming"""
    try:
        result = await integration_orchestrator.process_input_with_streaming(
            session_id=session_id,
            text=request.text,
            input_type=request.input_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/process-batch")
async def process_batch_with_streaming(session_id: str, request: BatchStreamRequest):
    """Process batch with real-time streaming"""
    try:
        result = await integration_orchestrator.process_batch_with_streaming(
            session_id=session_id,
            texts=request.texts
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/start")
async def start_stream(session_id: str):
    """Start streaming for a session"""
    await stream_processor.start_stream(session_id)
    return {"status": "started", "session_id": session_id}


@router.post("/{session_id}/stop")
async def stop_stream(session_id: str):
    """Stop streaming for a session"""
    await stream_processor.stop_stream(session_id)
    return {"status": "stopped", "session_id": session_id}


@router.get("/{session_id}/status")
async def get_stream_status(session_id: str):
    """Get stream status"""
    status = stream_processor.get_stream_status(session_id)
    return status
