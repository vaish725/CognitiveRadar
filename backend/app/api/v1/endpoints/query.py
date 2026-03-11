from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.graph_query import graph_query
from app.models.graph import EdgeType

router = APIRouter(prefix="/query", tags=["query"])


class PathRequest(BaseModel):
    start_node_id: str
    end_node_id: str
    max_depth: Optional[int] = 5


class SubgraphRequest(BaseModel):
    node_id: str
    depth: Optional[int] = 2


class NeighborsRequest(BaseModel):
    node_id: str
    edge_types: Optional[List[EdgeType]] = None
    direction: Optional[str] = "both"


@router.get("/{session_id}/node/{node_id}")
async def get_node(session_id: str, node_id: str):
    """Get a specific node"""
    node = await graph_query.get_node(session_id, node_id)
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    return node.dict()


@router.post("/{session_id}/neighbors")
async def get_neighbors(session_id: str, request: NeighborsRequest):
    """Get neighboring nodes"""
    result = await graph_query.get_node_neighbors(
        session_id=session_id,
        node_id=request.node_id,
        edge_types=request.edge_types,
        direction=request.direction
    )
    
    return result


@router.post("/{session_id}/path")
async def find_path(session_id: str, request: PathRequest):
    """Find shortest path between two nodes"""
    path = await graph_query.find_path(
        session_id=session_id,
        start_node_id=request.start_node_id,
        end_node_id=request.end_node_id,
        max_depth=request.max_depth
    )
    
    if path is None:
        raise HTTPException(status_code=404, detail="No path found")
    
    return {"path": path}


@router.post("/{session_id}/subgraph")
async def get_subgraph(session_id: str, request: SubgraphRequest):
    """Get subgraph around a node"""
    subgraph = await graph_query.get_subgraph(
        session_id=session_id,
        node_id=request.node_id,
        depth=request.depth
    )
    
    return subgraph


@router.get("/{session_id}/contradictions")
async def find_contradictions(session_id: str):
    """Find all contradictions in the graph"""
    contradictions = await graph_query.find_contradictions(session_id)
    
    return {"contradictions": contradictions}


@router.get("/{session_id}/dependencies/{node_id}")
async def find_dependencies(session_id: str, node_id: str):
    """Find all dependencies for a node"""
    dependencies = await graph_query.find_dependencies(session_id, node_id)
    
    return {"dependencies": dependencies}


@router.get("/{session_id}/support-chains/{node_id}")
async def find_support_chain(session_id: str, node_id: str, max_depth: int = 5):
    """Find support evidence chains"""
    chains = await graph_query.find_support_chain(
        session_id=session_id,
        node_id=node_id,
        max_depth=max_depth
    )
    
    return {"chains": chains}


@router.get("/{session_id}/statistics")
async def get_statistics(session_id: str):
    """Get graph statistics"""
    stats = await graph_query.get_graph_statistics(session_id)
    
    if not stats:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return stats


@router.post("/{session_id}/snapshot")
async def create_snapshot(session_id: str, name: Optional[str] = ""):
    """Create a graph snapshot"""
    from app.services.graph_storage import graph_storage
    
    try:
        snapshot_id = await graph_storage.create_snapshot(session_id, name)
        return {"snapshot_id": snapshot_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{session_id}/snapshots")
async def list_snapshots(session_id: str, limit: int = 10):
    """List all snapshots for a session"""
    from app.services.graph_storage import graph_storage
    
    snapshots = await graph_storage.list_snapshots(session_id, limit)
    return {"snapshots": snapshots}


@router.get("/snapshot/{snapshot_id}")
async def get_snapshot(snapshot_id: str):
    """Get a specific snapshot"""
    from app.services.graph_storage import graph_storage
    
    snapshot = await graph_storage.get_snapshot(snapshot_id)
    
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    return snapshot
