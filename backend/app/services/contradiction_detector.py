from typing import List, Dict, Any, Tuple
from app.services.gemini_service import gemini_service
from app.utils.prompts import PromptTemplates
from app.core.logging import get_logger
from app.models.graph import Node, NodeType

logger = get_logger(__name__)


class ContradictionDetector:
    """Detect contradictions and logical conflicts"""
    
    def __init__(self):
        self.prompts = PromptTemplates()
    
    async def detect_contradictions(
        self,
        nodes: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detect contradictions between nodes
        
        Returns list of contradiction pairs with analysis
        """
        try:
            contradictions = []
            
            claims = [n for n in nodes if n.get("node_type") == NodeType.CLAIM.value]
            
            for i, node1 in enumerate(claims):
                for node2 in claims[i+1:]:
                    if await self._are_contradictory(node1["text"], node2["text"]):
                        contradiction = {
                            "node1": node1,
                            "node2": node2,
                            "type": await self._classify_contradiction(
                                node1["text"],
                                node2["text"]
                            ),
                            "severity": self._calculate_severity(node1, node2)
                        }
                        contradictions.append(contradiction)
            
            logger.info(f"Detected {len(contradictions)} contradictions")
            return contradictions
        except Exception as e:
            logger.error(f"Error detecting contradictions: {e}")
            return []
    
    async def analyze_semantic_contradictions(
        self,
        text1: str,
        text2: str
    ) -> Dict[str, Any]:
        """
        Perform deep semantic analysis of contradiction
        """
        try:
            prompt = f"""Analyze if these statements contradict each other:

Statement 1: {text1}
Statement 2: {text2}

Return JSON with:
{{
    "is_contradictory": true/false,
    "type": "direct|indirect|contextual|none",
    "explanation": "detailed explanation",
    "confidence": 0.0-1.0,
    "resolution_suggestions": ["suggestion1", "suggestion2"]
}}"""
            
            result = await gemini_service.generate_structured_content(prompt)
            
            if not result:
                return {
                    "is_contradictory": False,
                    "type": "none",
                    "confidence": 0.0
                }
            
            return result
        except Exception as e:
            logger.error(f"Error analyzing semantic contradiction: {e}")
            return {"is_contradictory": False, "type": "none"}
    
    async def detect_temporal_contradictions(
        self,
        nodes: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detect contradictions across time
        """
        try:
            temporal = []
            
            claims_with_time = [
                n for n in nodes
                if n.get("node_type") == NodeType.CLAIM.value
                and n.get("metadata", {}).get("timestamp")
            ]
            
            claims_with_time.sort(
                key=lambda x: x.get("metadata", {}).get("timestamp", 0)
            )
            
            for i, node1 in enumerate(claims_with_time):
                for node2 in claims_with_time[i+1:]:
                    if await self._are_contradictory(node1["text"], node2["text"]):
                        temporal.append({
                            "earlier": node1,
                            "later": node2,
                            "type": "temporal_contradiction",
                            "time_gap": (
                                node2.get("metadata", {}).get("timestamp", 0) -
                                node1.get("metadata", {}).get("timestamp", 0)
                            )
                        })
            
            logger.info(f"Detected {len(temporal)} temporal contradictions")
            return temporal
        except Exception as e:
            logger.error(f"Error detecting temporal contradictions: {e}")
            return []
    
    async def find_logical_inconsistencies(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Find logical inconsistencies in the graph
        """
        try:
            inconsistencies = []
            
            for node in nodes:
                supporting = [
                    e for e in edges
                    if e["target_id"] == node["node_id"] and e["edge_type"] == "supports"
                ]
                
                contradicting = [
                    e for e in edges
                    if e["target_id"] == node["node_id"] and e["edge_type"] == "contradicts"
                ]
                
                if len(supporting) > 0 and len(contradicting) > 0:
                    inconsistencies.append({
                        "node": node,
                        "type": "mixed_support",
                        "description": "Node has both supporting and contradicting evidence",
                        "support_count": len(supporting),
                        "contradiction_count": len(contradicting)
                    })
            
            circular = await self._detect_circular_logic(nodes, edges)
            inconsistencies.extend(circular)
            
            logger.info(f"Found {len(inconsistencies)} logical inconsistencies")
            return inconsistencies
        except Exception as e:
            logger.error(f"Error finding logical inconsistencies: {e}")
            return []
    
    async def _are_contradictory(self, text1: str, text2: str) -> bool:
        """
        Check if two texts are contradictory
        """
        try:
            if self._quick_contradiction_check(text1, text2):
                return True
            
            analysis = await self.analyze_semantic_contradictions(text1, text2)
            return analysis.get("is_contradictory", False)
        except Exception as e:
            logger.error(f"Error checking contradiction: {e}")
            return False
    
    def _quick_contradiction_check(self, text1: str, text2: str) -> bool:
        """
        Quick heuristic check for obvious contradictions
        """
        text1_lower = text1.lower()
        text2_lower = text2.lower()
        
        negation_pairs = [
            ("is", "is not"),
            ("will", "will not"),
            ("can", "cannot"),
            ("should", "should not"),
            ("always", "never"),
            ("all", "none"),
            ("true", "false"),
            ("yes", "no")
        ]
        
        for pos, neg in negation_pairs:
            if (pos in text1_lower and neg in text2_lower) or \
               (neg in text1_lower and pos in text2_lower):
                words1 = set(text1_lower.split())
                words2 = set(text2_lower.split())
                overlap = len(words1 & words2)
                
                if overlap > 3:
                    return True
        
        return False
    
    async def _classify_contradiction(self, text1: str, text2: str) -> str:
        """
        Classify type of contradiction
        """
        analysis = await self.analyze_semantic_contradictions(text1, text2)
        return analysis.get("type", "unknown")
    
    def _calculate_severity(
        self,
        node1: Dict[str, Any],
        node2: Dict[str, Any]
    ) -> str:
        """
        Calculate contradiction severity
        """
        if self._quick_contradiction_check(node1["text"], node2["text"]):
            return "high"
        
        if node1.get("node_type") == NodeType.CLAIM.value and \
           node2.get("node_type") == NodeType.CLAIM.value:
            return "medium"
        
        return "low"
    
    async def _detect_circular_logic(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detect circular reasoning
        """
        try:
            circular = []
            
            adjacency = {}
            for edge in edges:
                if edge["edge_type"] in ["supports", "depends_on"]:
                    source = edge["source_id"]
                    target = edge["target_id"]
                    
                    if source not in adjacency:
                        adjacency[source] = []
                    adjacency[source].append(target)
            
            def has_cycle(node_id: str, visited: set, path: set) -> List[str]:
                if node_id in path:
                    return [node_id]
                
                if node_id in visited:
                    return []
                
                visited.add(node_id)
                path.add(node_id)
                
                for neighbor in adjacency.get(node_id, []):
                    cycle = has_cycle(neighbor, visited, path)
                    if cycle:
                        cycle.append(node_id)
                        return cycle
                
                path.remove(node_id)
                return []
            
            visited = set()
            for node in nodes:
                node_id = node["node_id"]
                if node_id not in visited:
                    cycle = has_cycle(node_id, visited, set())
                    if cycle:
                        circular.append({
                            "type": "circular_logic",
                            "cycle": cycle,
                            "description": "Circular reasoning detected"
                        })
            
            return circular
        except Exception as e:
            logger.error(f"Error detecting circular logic: {e}")
            return []


contradiction_detector = ContradictionDetector()
