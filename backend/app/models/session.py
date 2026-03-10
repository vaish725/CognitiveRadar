from typing import List, Optional
from pydantic import BaseModel


class Graph(BaseModel):
    session_id: str
    nodes: List[dict] = []
    edges: List[dict] = []
    created_at: int
    updated_at: int

    class Config:
        from_attributes = True


class GraphUpdate(BaseModel):
    nodes: Optional[List[dict]] = None
    edges: Optional[List[dict]] = None


class GraphResponse(BaseModel):
    session_id: str
    nodes: List[dict]
    edges: List[dict]
    node_count: int
    edge_count: int
    created_at: int
    updated_at: int
