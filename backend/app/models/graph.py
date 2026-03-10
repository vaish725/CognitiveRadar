from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class NodeType(str, Enum):
    CONCEPT = "concept"
    CLAIM = "claim"
    ASSUMPTION = "assumption"
    QUESTION = "question"
    EVIDENCE = "evidence"
    GAP = "gap"
    CONTRADICTION = "contradiction"


class EdgeType(str, Enum):
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"
    DEPENDS_ON = "depends_on"
    EXAMPLE_OF = "example_of"


class NodeBase(BaseModel):
    node_type: NodeType
    text: str
    confidence: float = Field(ge=0.0, le=1.0)


class NodeCreate(NodeBase):
    pass


class Node(NodeBase):
    node_id: str
    timestamp: int
    session_id: str

    class Config:
        from_attributes = True


class EdgeBase(BaseModel):
    source_node: str
    target_node: str
    relation_type: EdgeType
    confidence: float = Field(ge=0.0, le=1.0)


class EdgeCreate(EdgeBase):
    pass


class Edge(EdgeBase):
    edge_id: str
    session_id: str
    timestamp: int

    class Config:
        from_attributes = True
