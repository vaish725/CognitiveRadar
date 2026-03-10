from fastapi import APIRouter, HTTPException, status
import time
import uuid
from app.models import NodeCreate, Node, EdgeCreate, Edge
from app.core.database import db_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/graphs", tags=["graphs"])


@router.post("/{session_id}/nodes", response_model=Node, status_code=status.HTTP_201_CREATED)
async def add_node(session_id: str, node: NodeCreate):
    """Add a node to the graph"""
    try:
        doc_ref = db_service.get_collection("sessions").document(session_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        node_id = str(uuid.uuid4())
        timestamp = int(time.time() * 1000)
        
        node_data = {
            "node_id": node_id,
            "session_id": session_id,
            "node_type": node.node_type.value,
            "text": node.text,
            "confidence": node.confidence,
            "timestamp": timestamp
        }
        
        data = doc.to_dict()
        nodes = data.get("nodes", [])
        nodes.append(node_data)
        
        doc_ref.update({
            "nodes": nodes,
            "updated_at": timestamp
        })
        
        logger.info(f"Added node {node_id} to session {session_id}")
        
        return Node(**node_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding node to session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add node"
        )


@router.post("/{session_id}/edges", response_model=Edge, status_code=status.HTTP_201_CREATED)
async def add_edge(session_id: str, edge: EdgeCreate):
    """Add an edge to the graph"""
    try:
        doc_ref = db_service.get_collection("sessions").document(session_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        data = doc.to_dict()
        nodes = data.get("nodes", [])
        node_ids = [n["node_id"] for n in nodes]
        
        if edge.source_node not in node_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source node not found in graph"
            )
        
        if edge.target_node not in node_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target node not found in graph"
            )
        
        edge_id = str(uuid.uuid4())
        timestamp = int(time.time() * 1000)
        
        edge_data = {
            "edge_id": edge_id,
            "session_id": session_id,
            "source_node": edge.source_node,
            "target_node": edge.target_node,
            "relation_type": edge.relation_type.value,
            "confidence": edge.confidence,
            "timestamp": timestamp
        }
        
        edges = data.get("edges", [])
        edges.append(edge_data)
        
        doc_ref.update({
            "edges": edges,
            "updated_at": timestamp
        })
        
        logger.info(f"Added edge {edge_id} to session {session_id}")
        
        return Edge(**edge_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding edge to session {session_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add edge"
        )


@router.get("/{session_id}/nodes/{node_id}", response_model=Node)
async def get_node(session_id: str, node_id: str):
    """Get a specific node from the graph"""
    try:
        doc = db_service.get_collection("sessions").document(session_id).get()
        
        if not doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        data = doc.to_dict()
        nodes = data.get("nodes", [])
        
        node = next((n for n in nodes if n["node_id"] == node_id), None)
        
        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )
        
        return Node(**node)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving node {node_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve node"
        )
