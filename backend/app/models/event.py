from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel


class EventType(str, Enum):
    NODE_ADDED = "node_added"
    EDGE_ADDED = "edge_added"
    INSIGHT_GENERATED = "insight_generated"
    GAP_DETECTED = "gap_detected"
    CONTRADICTION_DETECTED = "contradiction_detected"
    CONTRADICTION_FOUND = "contradiction_found"
    ASSUMPTION_DETECTED = "assumption_detected"
    QUESTION_GENERATED = "question_generated"
    GRAPH_UPDATED = "graph_updated"
    SESSION_STARTED = "session_started"
    SESSION_ENDED = "session_ended"
    PROCESSING_STARTED = "processing_started"
    PROCESSING_COMPLETED = "processing_completed"
    ERROR_OCCURRED = "error_occurred"
    TRANSCRIPT_UPDATE = "transcript_update"


class GraphEvent(BaseModel):
    event_id: str
    event_type: EventType
    session_id: str
    timestamp: int
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
