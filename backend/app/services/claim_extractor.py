from typing import List, Dict, Any, Optional
from app.services.gemini_service import gemini_service
from app.utils.prompts import PromptTemplates
from app.models import NodeType
from app.core.logging import get_logger
import time

logger = get_logger(__name__)


class ClaimExtractor:
    """Extract claims and assertions from text using LLM"""
    
    def __init__(self):
        self.claim_history: List[Dict] = []
    
    async def extract_claims(
        self,
        text: str,
        context: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Extract structured claims from text"""
        try:
            prompt = PromptTemplates.claim_extraction(text)
            response = await gemini_service.generate_structured_content(prompt)
            
            claims = response.get("claims", [])
            
            validated_claims = []
            timestamp = int(time.time() * 1000)
            
            for claim in claims:
                if self._validate_claim(claim):
                    claim_data = {
                        "text": claim["text"],
                        "confidence": float(claim["confidence"]),
                        "type": NodeType.CLAIM,
                        "timestamp": timestamp
                    }
                    validated_claims.append(claim_data)
                    self._add_to_history(claim_data)
            
            logger.info(f"Extracted {len(validated_claims)} claims from text")
            return validated_claims
        except Exception as e:
            logger.error(f"Error extracting claims: {e}")
            raise
    
    def _validate_claim(self, claim: Dict) -> bool:
        """Validate claim data"""
        if not isinstance(claim, dict):
            return False
        if "text" not in claim or "confidence" not in claim:
            return False
        if not isinstance(claim["text"], str) or len(claim["text"]) == 0:
            return False
        confidence = float(claim["confidence"])
        if confidence < 0.0 or confidence > 1.0:
            return False
        return True
    
    def _add_to_history(self, claim: Dict):
        """Add claim to temporal history"""
        self.claim_history.append(claim)
        if len(self.claim_history) > 1000:
            self.claim_history = self.claim_history[-1000:]
    
    async def link_claims(
        self,
        claims: List[Dict],
        existing_claims: List[Dict]
    ) -> List[Dict[str, Any]]:
        """Find links between new claims and existing claims"""
        try:
            if not existing_claims:
                return []
            
            links = []
            
            for new_claim in claims[:5]:
                for existing_claim in existing_claims[-20:]:
                    similarity = await self._check_claim_similarity(
                        new_claim["text"],
                        existing_claim["text"]
                    )
                    
                    if similarity > 0.7:
                        links.append({
                            "source": new_claim["text"],
                            "target": existing_claim["text"],
                            "similarity": similarity
                        })
            
            logger.info(f"Found {len(links)} claim links")
            return links
        except Exception as e:
            logger.error(f"Error linking claims: {e}")
            return []
    
    async def _check_claim_similarity(
        self,
        claim1: str,
        claim2: str
    ) -> float:
        """Check semantic similarity between claims"""
        try:
            prompt = f"""
Compare these two claims and determine their semantic similarity (0.0 to 1.0):

Claim 1: {claim1}
Claim 2: {claim2}

Return only a JSON object:
{{"similarity": 0.0}}
"""
            response = await gemini_service.generate_structured_content(prompt)
            similarity = float(response.get("similarity", 0.0))
            return max(0.0, min(1.0, similarity))
        except Exception as e:
            logger.error(f"Error checking claim similarity: {e}")
            return 0.0
    
    def get_recent_claims(self, limit: int = 50) -> List[Dict]:
        """Get recent claims from history"""
        return self.claim_history[-limit:]
    
    def clear_history(self):
        """Clear claim history"""
        self.claim_history.clear()
        logger.info("Claim history cleared")


claim_extractor = ClaimExtractor()
