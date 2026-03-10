from fastapi import APIRouter, HTTPException, status
from typing import List
import time
import uuid
from app.models import Graph, GraphResponse
from app.core.database import db_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=GraphResponse, status_code=status.HTTP_201_CREATED)
async def create_session():
    """Create a new session with an empty graph"""
    try:
        session_id = str(uuid.uuid4())
        timestamp = int(time.time() * 1000)
        
        graph_data = {
            "session_id": session_id,
            "nodes": [],
            "edges": [],
            "created_at": timestamp,
            "updated_at": timestamp
        }
        
        db_service.get_collection("sessions").document(session_id).set(graph_data)
        
        logger.info(f"Created new session: {session_id}")
        
        return GraphResponse(
            session_id=session_id,
            nodes=[],
            edges=[],
            node_count=0,
            edge_count=0,
            created_at=timestamp,
            updated_at=timestamp
        )
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session"
        )


@router.get("/{session_id}", response_model=GraphResponse)
async def get_session(session_id: str):
    """Get a session's graph by ID"""
    try:
        doc = db_service.get_collection("sessions").document(session_id).get()
        
        if not doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        data = doc.to_dict()
        
        return GraphResponse(
            session_id=data["session_id"],
            nodes=data.get("nodes", []),
            edges=data.get("edges", []),
            node_count=len(data.get("nodes", [])),
            edge_count=len(data.get("edges", [])),
            created_at=data["created_at"],
            updated_at=data["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session"
        )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str):
    """Delete a session"""
    try:
        doc_ref = db_service.get_collection("sessions").document(session_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        doc_ref.delete()
        logger.info(f"Deleted session: {session_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete session"
        )


@router.get("", response_model=List[GraphResponse])
async def list_sessions(limit: int = 10):
    """List recent sessions"""
    try:
        sessions = []
        docs = db_service.get_collection("sessions")\
            .order_by("created_at", direction="DESCENDING")\
            .limit(limit)\
            .stream()
        
        for doc in docs:
            data = doc.to_dict()
            sessions.append(GraphResponse(
                session_id=data["session_id"],
                nodes=data.get("nodes", []),
                edges=data.get("edges", []),
                node_count=len(data.get("nodes", [])),
                edge_count=len(data.get("edges", [])),
                created_at=data["created_at"],
                updated_at=data["updated_at"]
            ))
        
        return sessions
    except Exception as e:
        logger.error(f"Error listing sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list sessions"
        )
