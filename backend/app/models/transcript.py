from typing import Optional, List
from pydantic import BaseModel


class TranscriptSegment(BaseModel):
    segment_id: str
    session_id: str
    text: str
    timestamp: int
    speaker: Optional[str] = None
    node_ids: List[str] = []

    class Config:
        from_attributes = True


class TranscriptSegmentCreate(BaseModel):
    text: str
    speaker: Optional[str] = None
    node_ids: List[str] = []
