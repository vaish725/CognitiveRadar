from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.connection_manager import connection_manager
from app.core.logging import get_logger
import json
import time

router = APIRouter()
logger = get_logger(__name__)


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time updates"""
    await connection_manager.connect(websocket, session_id)
    
    try:
        last_heartbeat = time.time()
        heartbeat_interval = 30
        
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    await connection_manager.send_personal_message(
                        websocket,
                        {
                            "type": "pong",
                            "timestamp": int(time.time() * 1000)
                        }
                    )
                    last_heartbeat = time.time()
                
                elif message.get("type") == "subscribe":
                    logger.info(f"Client subscribed to session {session_id}")
                
                elif message.get("type") == "unsubscribe":
                    logger.info(f"Client unsubscribed from session {session_id}")
                    break
                
                if time.time() - last_heartbeat > heartbeat_interval:
                    await connection_manager.send_personal_message(
                        websocket,
                        {
                            "type": "heartbeat",
                            "timestamp": int(time.time() * 1000)
                        }
                    )
                    last_heartbeat = time.time()
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await connection_manager.send_personal_message(
                    websocket,
                    {
                        "type": "error",
                        "message": "Invalid JSON format"
                    }
                )
            except Exception as e:
                logger.error(f"Error in WebSocket loop: {e}")
                break
    
    finally:
        connection_manager.disconnect(websocket)


@router.get("/ws/status/{session_id}")
async def get_websocket_status(session_id: str):
    """Get WebSocket connection status for a session"""
    return {
        "session_id": session_id,
        "is_active": connection_manager.is_session_active(session_id),
        "connection_count": connection_manager.get_session_connection_count(session_id),
        "total_connections": connection_manager.get_total_connections()
    }
