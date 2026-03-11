from typing import List, Dict, Any, Optional, Tuple
import uuid
import time
from app.models import Node, NodeCreate, Edge, EdgeCreate, NodeType, EdgeType
from app.core.database import db_service
from app.core.logging import get_logger

logger = get_logger(__name__)


class GraphBuilder:
    """Build and manage knowledge graphs"""
    
    async def create_node(
        self,
        session_id: str,
        node_data: Dict[str, Any]
    ) -> Node:
        """Create a new node in the graph"""
        try:
            node_id = str(uuid.uuid4())
            timestamp = int(time.time() * 1000)
            
            node = Node(
                node_id=node_id,
                session_id=session_id,
                node_type=node_data.get("type", NodeType.CONCEPT),
                text=node_data["text"],
                confidence=node_data.get("confidence", 0.8),
                timestamp=timestamp
            )
            
            doc_ref = db_service.get_collection("sessions").document(session_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise ValueError(f"Session {session_id} not found")
            
            data = doc.to_dict()
            nodes = data.get("nodes", [])
            
            duplicate = self._find_duplicate_node(node.text, nodes)
            if duplicate:
                logger.info(f"Found duplicate node, returning existing: {duplicate['node_id']}")
                return Node(**duplicate)
            
            node_dict = node.dict()
            nodes.append(node_dict)
            
            doc_ref.update({
                "nodes": nodes,
                "updated_at": timestamp
            })
            
            logger.info(f"Created node {node_id} in session {session_id}")
            return node
        except Exception as e:
            logger.error(f"Error creating node: {e}")
            raise
    
    async def create_edge(
        self,
        session_id: str,
        edge_data: Dict[str, Any]
    ) -> Edge:
        """Create a new edge in the graph"""
        try:
            edge_id = str(uuid.uuid4())
            timestamp = int(time.time() * 1000)
            
            edge = Edge(
                edge_id=edge_id,
                session_id=session_id,
                source_node=edge_data["source"],
                target_node=edge_data["target"],
                relation_type=edge_data.get("type", EdgeType.SUPPORTS),
                confidence=edge_data.get("confidence", 0.8),
                timestamp=timestamp
            )
            
            doc_ref = db_service.get_collection("sessions").document(session_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise ValueError(f"Session {session_id} not found")
            
            data = doc.to_dict()
            edges = data.get("edges", [])
            
            duplicate = self._find_duplicate_edge(
                edge.source_node,
                edge.target_node,
                edge.relation_type,
                edges
            )
            if duplicate:
                logger.info(f"Found duplicate edge, returning existing: {duplicate['edge_id']}")
                return Edge(**duplicate)
            
            edge_dict = edge.dict()
            edges.append(edge_dict)
            
            doc_ref.update({
                "edges": edges,
                "updated_at": timestamp
            })
            
            logger.info(f"Created edge {edge_id} in session {session_id}")
            return edge
        except Exception as e:
            logger.error(f"Error creating edge: {e}")
            raise
    
    async def create_graph_from_extraction(
        self,
        session_id: str,
        extraction_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create graph nodes and edges from extraction results"""
        try:
            created_nodes = []
            created_edges = []
            node_text_to_id = {}
            
            for concept in extraction_result.get("concepts", []):
                node = await self.create_node(session_id, {
                    "text": concept["text"],
                    "type": NodeType.CONCEPT,
                    "confidence": concept["confidence"]
                })
                created_nodes.append(node)
                node_text_to_id[concept["text"].lower()] = node.node_id
            
            for claim in extraction_result.get("claims", []):
                node = await self.create_node(session_id, {
                    "text": claim["text"],
                    "type": NodeType.CLAIM,
                    "confidence": claim["confidence"]
                })
                created_nodes.append(node)
                node_text_to_id[claim["text"].lower()] = node.node_id
            
            for relationship in extraction_result.get("relationships", []):
                source_text = relationship["source"].lower()
                target_text = relationship["target"].lower()
                
                if source_text in node_text_to_id and target_text in node_text_to_id:
                    edge = await self.create_edge(session_id, {
                        "source": node_text_to_id[source_text],
                        "target": node_text_to_id[target_text],
                        "type": relationship["type"],
                        "confidence": relationship["confidence"]
                    })
                    created_edges.append(edge)
            
            logger.info(f"Created {len(created_nodes)} nodes and {len(created_edges)} edges")
            
            return {
                "nodes": [node.dict() for node in created_nodes],
                "edges": [edge.dict() for edge in created_edges]
            }
        except Exception as e:
            logger.error(f"Error creating graph from extraction: {e}")
            raise
    
    def _find_duplicate_node(
        self,
        text: str,
        existing_nodes: List[Dict]
    ) -> Optional[Dict]:
        """Find duplicate node by text similarity"""
        text_lower = text.lower().strip()
        
        for node in existing_nodes:
            existing_text = node["text"].lower().strip()
            if existing_text == text_lower:
                return node
            
            if self._calculate_text_similarity(text_lower, existing_text) > 0.95:
                return node
        
        return None
    
    def _find_duplicate_edge(
        self,
        source: str,
        target: str,
        relation_type: EdgeType,
        existing_edges: List[Dict]
    ) -> Optional[Dict]:
        """Find duplicate edge"""
        for edge in existing_edges:
            if (edge["source_node"] == source and
                edge["target_node"] == target and
                edge["relation_type"] == relation_type.value):
                return edge
        
        return None
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate simple text similarity"""
        if text1 == text2:
            return 1.0
        
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)


graph_builder = GraphBuilder()
