from enum import Enum
from typing import List, Optional
from pydantic import BaseModel


class InsightType(str, Enum):
    GAP = "gap"
    ASSUMPTION = "assumption"
    CONTRADICTION = "contradiction"
    QUESTION = "question"


class Insight(BaseModel):
    insight_id: str
    session_id: str
    insight_type: InsightType
    title: str
    description: str
    related_nodes: List[str]
    timestamp: int
    severity: Optional[float] = None

    class Config:
        from_attributes = True


class InsightCreate(BaseModel):
    insight_type: InsightType
    title: str
    description: str
    related_nodes: List[str]
    severity: Optional[float] = None
