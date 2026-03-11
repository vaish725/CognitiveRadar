from typing import List, Dict, Any
from app.services.gemini_service import gemini_service
from app.utils.prompts import PromptTemplates
from app.core.logging import get_logger
from app.models.graph import Node, NodeType

logger = get_logger(__name__)


class GapDetector:
    """Detect knowledge gaps in the graph"""
    
    def __init__(self):
        self.prompts = PromptTemplates()
    
    async def detect_gaps(
        self,
        context: str,
        nodes: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detect knowledge gaps in the context
        
        Returns list of gaps with severity scoring
        """
        try:
            concepts = [n for n in nodes if n.get("node_type") == NodeType.CONCEPT.value]
            claims = [n for n in nodes if n.get("node_type") == NodeType.CLAIM.value]
            
            prompt = self.prompts.gap_detection(
                context=context,
                concepts=[c["text"] for c in concepts],
                claims=[cl["text"] for cl in claims]
            )
            
            result = await gemini_service.generate_structured_content(prompt)
            
            if not result or "gaps" not in result:
                logger.warning("No gaps detected in response")
                return []
            
            gaps = []
            for gap in result["gaps"]:
                if self._validate_gap(gap):
                    gap["severity"] = self._calculate_severity(gap, nodes)
                    gaps.append(gap)
            
            gaps.sort(key=lambda x: x.get("severity", 0), reverse=True)
            
            logger.info(f"Detected {len(gaps)} knowledge gaps")
            return gaps
        except Exception as e:
            logger.error(f"Error detecting gaps: {e}")
            return []
    
    async def analyze_missing_links(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Analyze missing logical connections between nodes
        """
        try:
            missing_links = []
            
            node_dict = {n["node_id"]: n for n in nodes}
            
            connected_pairs = set()
            for edge in edges:
                connected_pairs.add((edge["source_id"], edge["target_id"]))
                connected_pairs.add((edge["target_id"], edge["source_id"]))
            
            concepts = [n for n in nodes if n.get("node_type") == NodeType.CONCEPT.value]
            
            for i, node1 in enumerate(concepts):
                for node2 in concepts[i+1:]:
                    if (node1["node_id"], node2["node_id"]) not in connected_pairs:
                        similarity = self._calculate_semantic_similarity(
                            node1["text"],
                            node2["text"]
                        )
                        
                        if similarity > 0.6:
                            missing_links.append({
                                "node1": node1["text"],
                                "node2": node2["text"],
                                "similarity": similarity,
                                "gap_type": "missing_connection"
                            })
            
            logger.info(f"Found {len(missing_links)} potential missing links")
            return missing_links[:20]
        except Exception as e:
            logger.error(f"Error analyzing missing links: {e}")
            return []
    
    async def identify_incomplete_arguments(
        self,
        claims: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Identify claims without sufficient support
        """
        try:
            incomplete = []
            
            for claim in claims:
                if claim.get("node_type") != NodeType.CLAIM.value:
                    continue
                
                support_count = sum(
                    1 for e in edges
                    if e["target_id"] == claim["node_id"] and e["edge_type"] == "supports"
                )
                
                if support_count == 0:
                    incomplete.append({
                        "claim": claim["text"],
                        "claim_id": claim["node_id"],
                        "gap_type": "unsupported_claim",
                        "severity": "high",
                        "description": "Claim lacks supporting evidence"
                    })
                elif support_count < 2:
                    incomplete.append({
                        "claim": claim["text"],
                        "claim_id": claim["node_id"],
                        "gap_type": "weak_support",
                        "severity": "medium",
                        "description": "Claim has insufficient supporting evidence"
                    })
            
            logger.info(f"Found {len(incomplete)} incomplete arguments")
            return incomplete
        except Exception as e:
            logger.error(f"Error identifying incomplete arguments: {e}")
            return []
    
    def _validate_gap(self, gap: Dict[str, Any]) -> bool:
        """Validate gap structure"""
        required_fields = ["gap_type", "description"]
        return all(field in gap for field in required_fields)
    
    def _calculate_severity(
        self,
        gap: Dict[str, Any],
        nodes: List[Dict[str, Any]]
    ) -> int:
        """
        Calculate gap severity (0-100)
        
        Higher severity for gaps in core concepts
        """
        severity = 50
        
        gap_type = gap.get("gap_type", "")
        
        if gap_type == "missing_definition":
            severity += 30
        elif gap_type == "unsupported_claim":
            severity += 25
        elif gap_type == "missing_evidence":
            severity += 20
        elif gap_type == "incomplete_explanation":
            severity += 15
        
        if gap.get("affects_core_concept", False):
            severity += 20
        
        return min(severity, 100)
    
    def _calculate_semantic_similarity(
        self,
        text1: str,
        text2: str
    ) -> float:
        """
        Calculate semantic similarity between two texts
        
        Simple word overlap for now
        """
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1 & words2
        union = words1 | words2
        
        return len(intersection) / len(union)


gap_detector = GapDetector()
