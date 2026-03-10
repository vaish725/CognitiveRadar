from typing import List, Dict, Any, Optional
from app.services.gemini_service import gemini_service
from app.utils.prompts import PromptTemplates
from app.models import EdgeType
from app.core.logging import get_logger

logger = get_logger(__name__)


class RelationshipDetector:
    """Detect relationships between nodes using LLM"""
    
    async def detect_relationships(
        self,
        source_text: str,
        target_text: str,
        context: str = ""
    ) -> Optional[Dict[str, Any]]:
        """Detect relationship between two statements"""
        try:
            prompt = PromptTemplates.relationship_detection(
                source_text,
                target_text,
                context
            )
            response = await gemini_service.generate_structured_content(prompt)
            
            if not response.get("has_relationship", False):
                return None
            
            relationship_type = response.get("relationship_type", "")
            if not self._validate_relationship_type(relationship_type):
                logger.warning(f"Invalid relationship type: {relationship_type}")
                return None
            
            relationship = {
                "type": relationship_type,
                "confidence": float(response.get("confidence", 0.5)),
                "explanation": response.get("explanation", "")
            }
            
            logger.debug(f"Detected {relationship_type} relationship")
            return relationship
        except Exception as e:
            logger.error(f"Error detecting relationship: {e}")
            return None
    
    def _validate_relationship_type(self, rel_type: str) -> bool:
        """Validate relationship type"""
        valid_types = [e.value for e in EdgeType]
        return rel_type in valid_types
    
    async def detect_support_relationships(
        self,
        claim: str,
        evidence_candidates: List[str]
    ) -> List[Dict[str, Any]]:
        """Detect support relationships between claim and evidence"""
        try:
            relationships = []
            
            for evidence in evidence_candidates:
                relationship = await self.detect_relationships(
                    claim,
                    evidence,
                    "Evidence for claim"
                )
                
                if relationship and relationship["type"] == EdgeType.SUPPORTS.value:
                    relationships.append({
                        "evidence": evidence,
                        "confidence": relationship["confidence"]
                    })
            
            relationships.sort(key=lambda x: x["confidence"], reverse=True)
            logger.info(f"Found {len(relationships)} support relationships")
            return relationships
        except Exception as e:
            logger.error(f"Error detecting support relationships: {e}")
            return []
    
    async def detect_contradiction_relationships(
        self,
        claims: List[str]
    ) -> List[Dict[str, Any]]:
        """Detect contradictions between claims"""
        try:
            contradictions = []
            
            for i, claim1 in enumerate(claims):
                for claim2 in claims[i+1:]:
                    relationship = await self.detect_relationships(
                        claim1,
                        claim2,
                        "Check for contradiction"
                    )
                    
                    if relationship and relationship["type"] == EdgeType.CONTRADICTS.value:
                        contradictions.append({
                            "claim1": claim1,
                            "claim2": claim2,
                            "confidence": relationship["confidence"],
                            "explanation": relationship["explanation"]
                        })
            
            logger.info(f"Found {len(contradictions)} contradictions")
            return contradictions
        except Exception as e:
            logger.error(f"Error detecting contradictions: {e}")
            return []
    
    async def detect_dependency_relationships(
        self,
        claims: List[str]
    ) -> List[Dict[str, Any]]:
        """Detect dependency relationships between claims"""
        try:
            dependencies = []
            
            for i, claim1 in enumerate(claims):
                for j, claim2 in enumerate(claims):
                    if i == j:
                        continue
                    
                    relationship = await self.detect_relationships(
                        claim1,
                        claim2,
                        "Check for logical dependency"
                    )
                    
                    if relationship and relationship["type"] == EdgeType.DEPENDS_ON.value:
                        dependencies.append({
                            "dependent": claim1,
                            "prerequisite": claim2,
                            "confidence": relationship["confidence"]
                        })
            
            logger.info(f"Found {len(dependencies)} dependencies")
            return dependencies
        except Exception as e:
            logger.error(f"Error detecting dependencies: {e}")
            return []
    
    async def batch_detect_relationships(
        self,
        nodes: List[Dict],
        max_comparisons: int = 50
    ) -> List[Dict[str, Any]]:
        """Detect relationships between multiple nodes efficiently"""
        try:
            relationships = []
            comparisons = 0
            
            for i, node1 in enumerate(nodes):
                for node2 in nodes[i+1:]:
                    if comparisons >= max_comparisons:
                        break
                    
                    relationship = await self.detect_relationships(
                        node1["text"],
                        node2["text"]
                    )
                    
                    if relationship:
                        relationships.append({
                            "source": node1["text"],
                            "target": node2["text"],
                            "type": relationship["type"],
                            "confidence": relationship["confidence"]
                        })
                    
                    comparisons += 1
                
                if comparisons >= max_comparisons:
                    break
            
            logger.info(f"Detected {len(relationships)} relationships from {comparisons} comparisons")
            return relationships
        except Exception as e:
            logger.error(f"Error in batch relationship detection: {e}")
            return []


relationship_detector = RelationshipDetector()
