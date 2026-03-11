from typing import Dict, Set, Optional
from fastapi import WebSocket
from app.core.logging import get_logger
import json
import time

logger = get_logger(__name__)


class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.connection_sessions: Dict[WebSocket, str] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        """Connect a WebSocket to a session"""
        await websocket.accept()
        
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        
        self.active_connections[session_id].add(websocket)
        self.connection_sessions[websocket] = session_id
        
        logger.info(f"WebSocket connected to session {session_id}")
        
        await self.send_personal_message(
            websocket,
            {
                "type": "connection_established",
                "session_id": session_id,
                "timestamp": int(time.time() * 1000)
            }
        )
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket"""
        session_id = self.connection_sessions.get(websocket)
        
        if session_id and session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        
        if websocket in self.connection_sessions:
            del self.connection_sessions[websocket]
        
        logger.info(f"WebSocket disconnected from session {session_id}")
    
    async def send_personal_message(self, websocket: WebSocket, message: dict):
        """Send message to specific WebSocket"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast_to_session(self, session_id: str, message: dict):
        """Broadcast message to all connections in a session"""
        if session_id not in self.active_connections:
            logger.warning(f"No active connections for session {session_id}")
            return
        
        dead_connections = []
        
        for connection in self.active_connections[session_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                dead_connections.append(connection)
        
        for connection in dead_connections:
            self.disconnect(connection)
    
    async def broadcast_to_all(self, message: dict):
        """Broadcast message to all connections"""
        for session_id in list(self.active_connections.keys()):
            await self.broadcast_to_session(session_id, message)
    
    def get_session_connection_count(self, session_id: str) -> int:
        """Get number of connections for a session"""
        return len(self.active_connections.get(session_id, set()))
    
    def get_total_connections(self) -> int:
        """Get total number of active connections"""
        return sum(len(conns) for conns in self.active_connections.values())
    
    def is_session_active(self, session_id: str) -> bool:
        """Check if session has any active connections"""
        return session_id in self.active_connections and len(self.active_connections[session_id]) > 0


connection_manager = ConnectionManager()
