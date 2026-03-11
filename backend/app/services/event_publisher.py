from typing import Dict, Any, List, Optional
from collections import deque
import asyncio
import time
import uuid
from app.models.event import GraphEvent, EventType
from app.services.connection_manager import connection_manager
from app.core.logging import get_logger

logger = get_logger(__name__)


class EventPublisher:
    """Publish events to WebSocket connections"""
    
    def __init__(self, max_queue_size: int = 1000):
        self.event_queues: Dict[str, deque] = {}
        self.max_queue_size = max_queue_size
        self.processing_tasks: Dict[str, asyncio.Task] = {}
        self.recent_events: Dict[str, List[str]] = {}
        self.event_dedup_window = 5000
    
    async def publish(
        self,
        session_id: str,
        event_type: EventType,
        data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Publish an event to a session"""
        try:
            event_id = str(uuid.uuid4())
            timestamp = int(time.time() * 1000)
            
            if self._is_duplicate(session_id, event_type, data):
                logger.debug(f"Skipping duplicate event: {event_type}")
                return
            
            event = GraphEvent(
                event_id=event_id,
                event_type=event_type,
                session_id=session_id,
                timestamp=timestamp,
                data=data,
                metadata=metadata or {}
            )
            
            if session_id not in self.event_queues:
                self.event_queues[session_id] = deque(maxlen=self.max_queue_size)
            
            self.event_queues[session_id].append(event)
            
            self._track_event(session_id, event_id)
            
            if session_id not in self.processing_tasks or self.processing_tasks[session_id].done():
                self.processing_tasks[session_id] = asyncio.create_task(
                    self._process_queue(session_id)
                )
            
            logger.debug(f"Published event {event_type} to session {session_id}")
        except Exception as e:
            logger.error(f"Error publishing event: {e}")
    
    async def publish_node_added(self, session_id: str, node: Dict[str, Any]):
        """Publish node added event"""
        await self.publish(
            session_id=session_id,
            event_type=EventType.NODE_ADDED,
            data={"node": node}
        )
    
    async def publish_edge_added(self, session_id: str, edge: Dict[str, Any]):
        """Publish edge added event"""
        await self.publish(
            session_id=session_id,
            event_type=EventType.EDGE_ADDED,
            data={"edge": edge}
        )
    
    async def publish_insight(
        self,
        session_id: str,
        insight_type: str,
        insight: Dict[str, Any]
    ):
        """Publish insight event"""
        event_type_map = {
            "gap": EventType.GAP_DETECTED,
            "contradiction": EventType.CONTRADICTION_FOUND,
            "assumption": EventType.ASSUMPTION_DETECTED,
            "question": EventType.QUESTION_GENERATED
        }
        
        event_type = event_type_map.get(insight_type, EventType.INSIGHT_GENERATED)
        
        await self.publish(
            session_id=session_id,
            event_type=event_type,
            data={"insight": insight, "insight_type": insight_type}
        )
    
    async def publish_processing_status(
        self,
        session_id: str,
        status: str,
        progress: Optional[float] = None,
        message: Optional[str] = None
    ):
        """Publish processing status event"""
        event_type = (
            EventType.PROCESSING_STARTED if status == "started"
            else EventType.PROCESSING_COMPLETED
        )
        
        await self.publish(
            session_id=session_id,
            event_type=event_type,
            data={
                "status": status,
                "progress": progress,
                "message": message
            }
        )
    
    async def publish_error(
        self,
        session_id: str,
        error_type: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """Publish error event"""
        await self.publish(
            session_id=session_id,
            event_type=EventType.ERROR_OCCURRED,
            data={
                "error_type": error_type,
                "message": message,
                "details": details or {}
            }
        )
    
    async def _process_queue(self, session_id: str):
        """Process event queue for a session"""
        try:
            batch_size = 10
            batch_delay = 0.05
            
            while session_id in self.event_queues and self.event_queues[session_id]:
                batch = []
                
                for _ in range(batch_size):
                    if not self.event_queues[session_id]:
                        break
                    batch.append(self.event_queues[session_id].popleft())
                
                if batch:
                    await self._send_batch(session_id, batch)
                    await asyncio.sleep(batch_delay)
                else:
                    break
        except Exception as e:
            logger.error(f"Error processing event queue: {e}")
    
    async def _send_batch(self, session_id: str, events: List[GraphEvent]):
        """Send batch of events"""
        try:
            if len(events) == 1:
                message = events[0].dict()
                await connection_manager.broadcast_to_session(session_id, message)
            else:
                message = {
                    "event_type": "batch",
                    "session_id": session_id,
                    "timestamp": int(time.time() * 1000),
                    "events": [e.dict() for e in events]
                }
                await connection_manager.broadcast_to_session(session_id, message)
        except Exception as e:
            logger.error(f"Error sending batch: {e}")
    
    def _is_duplicate(
        self,
        session_id: str,
        event_type: EventType,
        data: Dict[str, Any]
    ) -> bool:
        """Check if event is a duplicate"""
        if session_id not in self.recent_events:
            return False
        
        event_hash = self._hash_event(event_type, data)
        
        if event_hash in self.recent_events[session_id]:
            return True
        
        return False
    
    def _track_event(self, session_id: str, event_id: str):
        """Track event for deduplication"""
        if session_id not in self.recent_events:
            self.recent_events[session_id] = []
        
        self.recent_events[session_id].append(event_id)
        
        if len(self.recent_events[session_id]) > 100:
            self.recent_events[session_id] = self.recent_events[session_id][-100:]
    
    def _hash_event(self, event_type: EventType, data: Dict[str, Any]) -> str:
        """Create hash for event deduplication"""
        import hashlib
        import json
        
        content = f"{event_type}:{json.dumps(data, sort_keys=True)}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def get_queue_size(self, session_id: str) -> int:
        """Get current queue size for session"""
        return len(self.event_queues.get(session_id, []))
    
    def clear_queue(self, session_id: str):
        """Clear event queue for session"""
        if session_id in self.event_queues:
            self.event_queues[session_id].clear()
        
        if session_id in self.processing_tasks:
            self.processing_tasks[session_id].cancel()
            del self.processing_tasks[session_id]


event_publisher = EventPublisher()
