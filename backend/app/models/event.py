from enum import Enum
from pydantic import BaseModel


class EventType(str, Enum):
    NODE_ADDED = "node_added"
    EDGE_ADDED = "edge_added"
    CONTRADICTION_DETECTED = "contradiction_detected"
    GAP_DETECTED = "gap_detected"
    ASSUMPTION_DETECTED = "assumption_detected"
    QUESTION_GENERATED = "question_generated"
    TRANSCRIPT_UPDATE = "transcript_update"


class GraphEvent(BaseModel):
    event_type: EventType
    session_id: str
    timestamp: int
    data: dict

    class Config:
        from_attributes = True
