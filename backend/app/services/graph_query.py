from typing import List, Dict, Any, Optional, Set
from app.models.graph import Node, Edge, EdgeType
from app.services.graph_storage import graph_storage
from app.core.logging import get_logger
from collections import deque

logger = get_logger(__name__)


class GraphQuery:
    """Query and traverse knowledge graphs"""
    
    async def get_node(
        self,
        session_id: str,
        node_id: str
    ) -> Optional[Node]:
        """Get a specific node by ID"""
        try:
            graph = await graph_storage.get_graph(session_id)
            
            if not graph:
                return None
            
            for node_data in graph["nodes"]:
                if node_data["node_id"] == node_id:
                    return Node(**node_data)
            
            return None
        except Exception as e:
            logger.error(f"Error getting node: {e}")
            return None
    
    async def get_node_neighbors(
        self,
        session_id: str,
        node_id: str,
        edge_types: List[EdgeType] = None,
        direction: str = "both"
    ) -> Dict[str, Any]:
        """
        Get neighboring nodes
        
        Args:
            session_id: Session ID
            node_id: Node ID
            edge_types: Filter by edge types
            direction: "in", "out", or "both"
        """
        try:
            graph = await graph_storage.get_graph(session_id)
            
            if not graph:
                return {"neighbors": [], "edges": []}
            
            neighbors = []
            edges_list = []
            
            for edge_data in graph["edges"]:
                edge = Edge(**edge_data)
                
                if edge_types and edge.edge_type not in edge_types:
                    continue
                
                is_source = edge.source_id == node_id
                is_target = edge.target_id == node_id
                
                if direction == "out" and is_source:
                    neighbor = await self.get_node(session_id, edge.target_id)
                    if neighbor:
                        neighbors.append(neighbor.dict())
                        edges_list.append(edge_data)
                
                elif direction == "in" and is_target:
                    neighbor = await self.get_node(session_id, edge.source_id)
                    if neighbor:
                        neighbors.append(neighbor.dict())
                        edges_list.append(edge_data)
                
                elif direction == "both" and (is_source or is_target):
                    neighbor_id = edge.target_id if is_source else edge.source_id
                    neighbor = await self.get_node(session_id, neighbor_id)
                    if neighbor:
                        neighbors.append(neighbor.dict())
                        edges_list.append(edge_data)
            
            return {
                "neighbors": neighbors,
                "edges": edges_list
            }
        except Exception as e:
            logger.error(f"Error getting neighbors: {e}")
            return {"neighbors": [], "edges": []}
    
    async def find_path(
        self,
        session_id: str,
        start_node_id: str,
        end_node_id: str,
        max_depth: int = 5
    ) -> Optional[List[Dict]]:
        """
        Find shortest path between two nodes using BFS
        
        Returns list of nodes in path
        """
        try:
            graph = await graph_storage.get_graph(session_id)
            
            if not graph:
                return None
            
            adjacency = self._build_adjacency_list(graph["edges"])
            
            queue = deque([(start_node_id, [start_node_id])])
            visited = {start_node_id}
            
            while queue:
                current, path = queue.popleft()
                
                if len(path) > max_depth:
                    continue
                
                if current == end_node_id:
                    result = []
                    for node_id in path:
                        node = await self.get_node(session_id, node_id)
                        if node:
                            result.append(node.dict())
                    return result
                
                for neighbor in adjacency.get(current, []):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append((neighbor, path + [neighbor]))
            
            return None
        except Exception as e:
            logger.error(f"Error finding path: {e}")
            return None
    
    async def get_subgraph(
        self,
        session_id: str,
        node_id: str,
        depth: int = 2
    ) -> Dict[str, Any]:
        """
        Extract subgraph around a node
        
        Args:
            session_id: Session ID
            node_id: Center node ID
            depth: How many hops to include
        """
        try:
            graph = await graph_storage.get_graph(session_id)
            
            if not graph:
                return {"nodes": [], "edges": []}
            
            adjacency = self._build_adjacency_list(graph["edges"])
            
            visited_nodes = set()
            current_level = {node_id}
            
            for _ in range(depth):
                next_level = set()
                for node in current_level:
                    if node not in visited_nodes:
                        visited_nodes.add(node)
                        next_level.update(adjacency.get(node, []))
                current_level = next_level
            
            nodes = []
            for node_data in graph["nodes"]:
                if node_data["node_id"] in visited_nodes:
                    nodes.append(node_data)
            
            edges = []
            for edge_data in graph["edges"]:
                if edge_data["source_id"] in visited_nodes and edge_data["target_id"] in visited_nodes:
                    edges.append(edge_data)
            
            return {
                "nodes": nodes,
                "edges": edges
            }
        except Exception as e:
            logger.error(f"Error getting subgraph: {e}")
            return {"nodes": [], "edges": []}
    
    async def find_contradictions(
        self,
        session_id: str
    ) -> List[Dict[str, Any]]:
        """Find all contradiction relationships"""
        try:
            graph = await graph_storage.get_graph(session_id)
            
            if not graph:
                return []
            
            contradictions = []
            
            for edge_data in graph["edges"]:
                if edge_data["edge_type"] == EdgeType.CONTRADICTS.value:
                    source = await self.get_node(session_id, edge_data["source_id"])
                    target = await self.get_node(session_id, edge_data["target_id"])
                    
                    if source and target:
                        contradictions.append({
                            "edge": edge_data,
                            "source": source.dict(),
                            "target": target.dict()
                        })
            
            return contradictions
        except Exception as e:
            logger.error(f"Error finding contradictions: {e}")
            return []
    
    async def find_dependencies(
        self,
        session_id: str,
        node_id: str
    ) -> List[Dict[str, Any]]:
        """Find all dependencies for a node"""
        try:
            result = await self.get_node_neighbors(
                session_id=session_id,
                node_id=node_id,
                edge_types=[EdgeType.DEPENDS_ON],
                direction="out"
            )
            
            return result["neighbors"]
        except Exception as e:
            logger.error(f"Error finding dependencies: {e}")
            return []
    
    async def find_support_chain(
        self,
        session_id: str,
        node_id: str,
        max_depth: int = 5
    ) -> List[List[Dict]]:
        """
        Find chains of support evidence
        
        Returns list of paths, each path is a list of nodes
        """
        try:
            graph = await graph_storage.get_graph(session_id)
            
            if not graph:
                return []
            
            chains = []
            
            def dfs(current_id: str, path: List[str], depth: int):
                if depth > max_depth:
                    return
                
                has_support = False
                
                for edge_data in graph["edges"]:
                    if (edge_data["target_id"] == current_id and 
                        edge_data["edge_type"] == EdgeType.SUPPORTS.value):
                        has_support = True
                        source_id = edge_data["source_id"]
                        if source_id not in path:
                            dfs(source_id, path + [source_id], depth + 1)
                
                if not has_support and len(path) > 1:
                    chains.append(path.copy())
            
            dfs(node_id, [node_id], 0)
            
            result = []
            for chain in chains:
                chain_nodes = []
                for nid in chain:
                    node = await self.get_node(session_id, nid)
                    if node:
                        chain_nodes.append(node.dict())
                if chain_nodes:
                    result.append(chain_nodes)
            
            return result
        except Exception as e:
            logger.error(f"Error finding support chains: {e}")
            return []
    
    async def get_graph_statistics(
        self,
        session_id: str
    ) -> Dict[str, Any]:
        """Get graph statistics"""
        try:
            graph = await graph_storage.get_graph(session_id)
            
            if not graph:
                return {}
            
            node_types = {}
            edge_types = {}
            
            for node_data in graph["nodes"]:
                node_type = node_data["node_type"]
                node_types[node_type] = node_types.get(node_type, 0) + 1
            
            for edge_data in graph["edges"]:
                edge_type = edge_data["edge_type"]
                edge_types[edge_type] = edge_types.get(edge_type, 0) + 1
            
            adjacency = self._build_adjacency_list(graph["edges"])
            avg_degree = sum(len(neighbors) for neighbors in adjacency.values()) / len(graph["nodes"]) if graph["nodes"] else 0
            
            return {
                "total_nodes": len(graph["nodes"]),
                "total_edges": len(graph["edges"]),
                "node_types": node_types,
                "edge_types": edge_types,
                "average_degree": round(avg_degree, 2)
            }
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
    
    def _build_adjacency_list(self, edges: List[Dict]) -> Dict[str, Set[str]]:
        """Build adjacency list from edges"""
        adjacency = {}
        
        for edge_data in edges:
            source = edge_data["source_id"]
            target = edge_data["target_id"]
            
            if source not in adjacency:
                adjacency[source] = set()
            if target not in adjacency:
                adjacency[target] = set()
            
            adjacency[source].add(target)
            adjacency[target].add(source)
        
        return adjacency


graph_query = GraphQuery()
