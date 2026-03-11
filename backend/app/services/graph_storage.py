from typing import List, Dict, Any, Optional
from app.core.database import db_service
from app.core.logging import get_logger
import time

logger = get_logger(__name__)


class GraphStorage:
    """Manage graph persistence and versioning"""
    
    async def save_graph(
        self,
        session_id: str,
        graph_data: Dict[str, Any]
    ) -> bool:
        """Save graph to database"""
        try:
            timestamp = int(time.time() * 1000)
            
            doc_ref = db_service.get_collection("sessions").document(session_id)
            
            update_data = {
                "updated_at": timestamp
            }
            
            if "nodes" in graph_data:
                update_data["nodes"] = graph_data["nodes"]
            
            if "edges" in graph_data:
                update_data["edges"] = graph_data["edges"]
            
            doc_ref.update(update_data)
            
            logger.info(f"Saved graph for session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Error saving graph: {e}")
            return False
    
    async def get_graph(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve graph from database"""
        try:
            doc = db_service.get_collection("sessions").document(session_id).get()
            
            if not doc.exists:
                logger.warning(f"Session {session_id} not found")
                return None
            
            data = doc.to_dict()
            
            graph = {
                "session_id": data["session_id"],
                "nodes": data.get("nodes", []),
                "edges": data.get("edges", []),
                "created_at": data["created_at"],
                "updated_at": data["updated_at"]
            }
            
            logger.info(f"Retrieved graph for session {session_id}")
            return graph
        except Exception as e:
            logger.error(f"Error retrieving graph: {e}")
            return None
    
    async def create_snapshot(
        self,
        session_id: str,
        snapshot_name: str = ""
    ) -> str:
        """Create a versioned snapshot of the graph"""
        try:
            graph = await self.get_graph(session_id)
            
            if not graph:
                raise ValueError(f"Session {session_id} not found")
            
            timestamp = int(time.time() * 1000)
            snapshot_id = f"{session_id}_{timestamp}"
            
            snapshot_data = {
                "snapshot_id": snapshot_id,
                "session_id": session_id,
                "name": snapshot_name or f"Snapshot {timestamp}",
                "nodes": graph["nodes"],
                "edges": graph["edges"],
                "created_at": timestamp
            }
            
            db_service.get_collection("snapshots").document(snapshot_id).set(snapshot_data)
            
            logger.info(f"Created snapshot {snapshot_id} for session {session_id}")
            return snapshot_id
        except Exception as e:
            logger.error(f"Error creating snapshot: {e}")
            raise
    
    async def get_snapshot(self, snapshot_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a graph snapshot"""
        try:
            doc = db_service.get_collection("snapshots").document(snapshot_id).get()
            
            if not doc.exists:
                logger.warning(f"Snapshot {snapshot_id} not found")
                return None
            
            return doc.to_dict()
        except Exception as e:
            logger.error(f"Error retrieving snapshot: {e}")
            return None
    
    async def list_snapshots(
        self,
        session_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """List all snapshots for a session"""
        try:
            snapshots = []
            docs = db_service.get_collection("snapshots")\
                .where("session_id", "==", session_id)\
                .order_by("created_at", direction="DESCENDING")\
                .limit(limit)\
                .stream()
            
            for doc in docs:
                snapshots.append(doc.to_dict())
            
            logger.info(f"Retrieved {len(snapshots)} snapshots for session {session_id}")
            return snapshots
        except Exception as e:
            logger.error(f"Error listing snapshots: {e}")
            return []
    
    async def update_graph_incrementally(
        self,
        session_id: str,
        new_nodes: List[Dict] = None,
        new_edges: List[Dict] = None
    ) -> bool:
        """Update graph by adding new nodes and edges"""
        try:
            graph = await self.get_graph(session_id)
            
            if not graph:
                raise ValueError(f"Session {session_id} not found")
            
            existing_nodes = graph["nodes"]
            existing_edges = graph["edges"]
            
            if new_nodes:
                existing_nodes.extend(new_nodes)
            
            if new_edges:
                existing_edges.extend(new_edges)
            
            return await self.save_graph(session_id, {
                "nodes": existing_nodes,
                "edges": existing_edges
            })
        except Exception as e:
            logger.error(f"Error updating graph: {e}")
            return False


graph_storage = GraphStorage()
