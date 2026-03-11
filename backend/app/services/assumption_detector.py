from typing import List, Dict, Any
from app.services.gemini_service import gemini_service
from app.utils.prompts import PromptTemplates
from app.core.logging import get_logger
from app.models.graph import Node, NodeType

logger = get_logger(__name__)


class AssumptionDetector:
    """Detect hidden assumptions in arguments"""
    
    def __init__(self):
        self.prompts = PromptTemplates()
    
    async def detect_assumptions(
        self,
        text: str,
        context: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect hidden assumptions in text
        
        Returns list of assumptions with confidence scores
        """
        try:
            prompt = self.prompts.assumption_detection(
                text=text,
                context=context or []
            )
            
            result = await gemini_service.generate_structured_content(prompt)
            
            if not result or "assumptions" not in result:
                logger.warning("No assumptions detected in response")
                return []
            
            assumptions = []
            for assumption in result["assumptions"]:
                if self._validate_assumption(assumption):
                    assumption["type"] = self._classify_assumption(assumption)
                    assumptions.append(assumption)
            
            logger.info(f"Detected {len(assumptions)} assumptions")
            return assumptions
        except Exception as e:
            logger.error(f"Error detecting assumptions: {e}")
            return []
    
    async def analyze_claim_assumptions(
        self,
        claim: str,
        evidence: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Analyze assumptions underlying a claim
        """
        try:
            context = [f"Evidence: {e}" for e in evidence]
            assumptions = await self.detect_assumptions(claim, context)
            
            for assumption in assumptions:
                assumption["claim"] = claim
                assumption["questionable"] = self._is_questionable(assumption)
            
            return assumptions
        except Exception as e:
            logger.error(f"Error analyzing claim assumptions: {e}")
            return []
    
    async def find_implicit_prerequisites(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Find implicit prerequisites not explicitly stated
        """
        try:
            implicit = []
            
            claims = [n for n in nodes if n.get("node_type") == NodeType.CLAIM.value]
            
            for claim in claims:
                dependencies = [
                    e for e in edges
                    if e["source_id"] == claim["node_id"] and e["edge_type"] == "depends_on"
                ]
                
                if len(dependencies) > 0:
                    assumptions = await self.detect_assumptions(
                        claim["text"],
                        context=[e["target_id"] for e in dependencies]
                    )
                    
                    for assumption in assumptions:
                        if not self._is_explicitly_stated(assumption, nodes):
                            implicit.append({
                                "claim": claim["text"],
                                "claim_id": claim["node_id"],
                                "assumption": assumption["text"],
                                "type": "implicit_prerequisite",
                                "confidence": assumption.get("confidence", 0.5)
                            })
            
            logger.info(f"Found {len(implicit)} implicit prerequisites")
            return implicit
        except Exception as e:
            logger.error(f"Error finding implicit prerequisites: {e}")
            return []
    
    async def detect_cultural_assumptions(
        self,
        text: str
    ) -> List[Dict[str, Any]]:
        """
        Detect cultural or contextual assumptions
        """
        try:
            prompt = f"""Identify cultural, social, or contextual assumptions in this text:

Text: {text}

Return JSON with:
{{
    "assumptions": [
        {{
            "text": "assumption text",
            "category": "cultural|social|temporal|contextual",
            "explanation": "why this is assumed"
        }}
    ]
}}"""
            
            result = await gemini_service.generate_structured_content(prompt)
            
            if not result or "assumptions" not in result:
                return []
            
            return result["assumptions"]
        except Exception as e:
            logger.error(f"Error detecting cultural assumptions: {e}")
            return []
    
    def _validate_assumption(self, assumption: Dict[str, Any]) -> bool:
        """Validate assumption structure"""
        return "text" in assumption and len(assumption["text"]) > 10
    
    def _classify_assumption(self, assumption: Dict[str, Any]) -> str:
        """
        Classify assumption type
        """
        text = assumption.get("text", "").lower()
        
        if any(word in text for word in ["everyone", "all", "always", "never"]):
            return "universal"
        elif any(word in text for word in ["should", "must", "ought"]):
            return "normative"
        elif any(word in text for word in ["cause", "because", "therefore"]):
            return "causal"
        elif any(word in text for word in ["value", "worth", "important"]):
            return "value"
        else:
            return "implicit"
    
    def _is_questionable(self, assumption: Dict[str, Any]) -> bool:
        """
        Determine if assumption is questionable
        """
        assumption_type = assumption.get("type", "")
        confidence = assumption.get("confidence", 0.5)
        
        if assumption_type == "universal":
            return True
        
        if confidence < 0.6:
            return True
        
        text = assumption.get("text", "").lower()
        questionable_phrases = [
            "obviously", "clearly", "everyone knows",
            "it goes without saying", "naturally"
        ]
        
        return any(phrase in text for phrase in questionable_phrases)
    
    def _is_explicitly_stated(
        self,
        assumption: Dict[str, Any],
        nodes: List[Dict[str, Any]]
    ) -> bool:
        """
        Check if assumption is explicitly stated in nodes
        """
        assumption_text = assumption.get("text", "").lower()
        
        for node in nodes:
            node_text = node.get("text", "").lower()
            
            similarity = self._calculate_text_similarity(assumption_text, node_text)
            if similarity > 0.8:
                return True
        
        return False
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate text similarity"""
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1 & words2
        union = words1 | words2
        
        return len(intersection) / len(union)


assumption_detector = AssumptionDetector()
