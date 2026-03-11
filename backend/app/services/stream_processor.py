import asyncio
from typing import Dict, Any, List
from app.services.event_publisher import event_publisher
from app.core.logging import get_logger

logger = get_logger(__name__)


class StreamProcessor:
    """Process and manage real-time event streams"""
    
    def __init__(self):
        self.active_streams: Dict[str, bool] = {}
        self.stream_buffers: Dict[str, List[Dict[str, Any]]] = {}
        self.max_buffer_size = 100
    
    async def start_stream(self, session_id: str):
        """Start processing stream for a session"""
        self.active_streams[session_id] = True
        self.stream_buffers[session_id] = []
        
        logger.info(f"Started stream for session {session_id}")
        
        await event_publisher.publish_processing_status(
            session_id=session_id,
            status="started",
            message="Stream processing started"
        )
    
    async def stop_stream(self, session_id: str):
        """Stop processing stream for a session"""
        self.active_streams[session_id] = False
        
        if session_id in self.stream_buffers:
            del self.stream_buffers[session_id]
        
        logger.info(f"Stopped stream for session {session_id}")
        
        await event_publisher.publish_processing_status(
            session_id=session_id,
            status="completed",
            message="Stream processing completed"
        )
    
    async def process_node_addition(
        self,
        session_id: str,
        node: Dict[str, Any]
    ):
        """Process and stream node addition"""
        try:
            if not self._is_stream_active(session_id):
                return
            
            if self._should_buffer(session_id):
                self._add_to_buffer(session_id, {"type": "node", "data": node})
                return
            
            await event_publisher.publish_node_added(session_id, node)
            
            logger.debug(f"Streamed node addition for session {session_id}")
        except Exception as e:
            logger.error(f"Error processing node addition: {e}")
    
    async def process_edge_addition(
        self,
        session_id: str,
        edge: Dict[str, Any]
    ):
        """Process and stream edge addition"""
        try:
            if not self._is_stream_active(session_id):
                return
            
            if self._should_buffer(session_id):
                self._add_to_buffer(session_id, {"type": "edge", "data": edge})
                return
            
            await event_publisher.publish_edge_added(session_id, edge)
            
            logger.debug(f"Streamed edge addition for session {session_id}")
        except Exception as e:
            logger.error(f"Error processing edge addition: {e}")
    
    async def process_batch_updates(
        self,
        session_id: str,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ):
        """Process batch of graph updates"""
        try:
            if not self._is_stream_active(session_id):
                return
            
            total_items = len(nodes) + len(edges)
            processed = 0
            
            for node in nodes:
                await self.process_node_addition(session_id, node)
                processed += 1
                
                if processed % 10 == 0:
                    progress = processed / total_items
                    await event_publisher.publish_processing_status(
                        session_id=session_id,
                        status="processing",
                        progress=progress,
                        message=f"Processing: {processed}/{total_items} items"
                    )
                
                await asyncio.sleep(0.01)
            
            for edge in edges:
                await self.process_edge_addition(session_id, edge)
                processed += 1
                
                if processed % 10 == 0:
                    progress = processed / total_items
                    await event_publisher.publish_processing_status(
                        session_id=session_id,
                        status="processing",
                        progress=progress,
                        message=f"Processing: {processed}/{total_items} items"
                    )
                
                await asyncio.sleep(0.01)
            
            await self._flush_buffer(session_id)
            
            logger.info(f"Processed batch: {len(nodes)} nodes, {len(edges)} edges")
        except Exception as e:
            logger.error(f"Error processing batch updates: {e}")
            await event_publisher.publish_error(
                session_id=session_id,
                error_type="batch_processing_error",
                message=str(e)
            )
    
    async def process_insight(
        self,
        session_id: str,
        insight_type: str,
        insight: Dict[str, Any]
    ):
        """Process and stream insight"""
        try:
            if not self._is_stream_active(session_id):
                return
            
            await event_publisher.publish_insight(
                session_id=session_id,
                insight_type=insight_type,
                insight=insight
            )
            
            logger.debug(f"Streamed {insight_type} insight for session {session_id}")
        except Exception as e:
            logger.error(f"Error processing insight: {e}")
    
    def _is_stream_active(self, session_id: str) -> bool:
        """Check if stream is active"""
        return self.active_streams.get(session_id, False)
    
    def _should_buffer(self, session_id: str) -> bool:
        """Determine if updates should be buffered"""
        if session_id not in self.stream_buffers:
            return False
        
        queue_size = event_publisher.get_queue_size(session_id)
        return queue_size > 50
    
    def _add_to_buffer(self, session_id: str, item: Dict[str, Any]):
        """Add item to buffer"""
        if session_id not in self.stream_buffers:
            self.stream_buffers[session_id] = []
        
        self.stream_buffers[session_id].append(item)
        
        if len(self.stream_buffers[session_id]) > self.max_buffer_size:
            self.stream_buffers[session_id] = self.stream_buffers[session_id][-self.max_buffer_size:]
    
    async def _flush_buffer(self, session_id: str):
        """Flush buffered items"""
        if session_id not in self.stream_buffers:
            return
        
        buffer = self.stream_buffers[session_id]
        
        for item in buffer:
            if item["type"] == "node":
                await event_publisher.publish_node_added(session_id, item["data"])
            elif item["type"] == "edge":
                await event_publisher.publish_edge_added(session_id, item["data"])
            
            await asyncio.sleep(0.01)
        
        self.stream_buffers[session_id].clear()
        
        logger.debug(f"Flushed {len(buffer)} buffered items for session {session_id}")
    
    def get_stream_status(self, session_id: str) -> Dict[str, Any]:
        """Get stream status"""
        return {
            "is_active": self._is_stream_active(session_id),
            "buffer_size": len(self.stream_buffers.get(session_id, [])),
            "queue_size": event_publisher.get_queue_size(session_id)
        }


stream_processor = StreamProcessor()
