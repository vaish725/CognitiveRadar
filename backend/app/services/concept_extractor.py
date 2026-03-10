from typing import List, Dict, Any, Optional
from app.services.gemini_service import gemini_service
from app.utils.prompts import PromptTemplates
from app.models import NodeType, NodeCreate
from app.core.logging import get_logger
import hashlib

logger = get_logger(__name__)


class ConceptExtractor:
    """Extract concepts from text using LLM"""
    
    def __init__(self):
        self.concept_cache: Dict[str, List[Dict]] = {}
    
    def _get_cache_key(self, text: str) -> str:
        """Generate cache key for text"""
        return hashlib.md5(text.encode()).hexdigest()
    
    async def extract_concepts(
        self,
        text: str,
        use_cache: bool = True
    ) -> List[Dict[str, Any]]:
        """Extract key concepts from text"""
        try:
            cache_key = self._get_cache_key(text)
            
            if use_cache and cache_key in self.concept_cache:
                logger.info("Retrieved concepts from cache")
                return self.concept_cache[cache_key]
            
            prompt = PromptTemplates.concept_extraction(text)
            response = await gemini_service.generate_structured_content(prompt)
            
            concepts = response.get("concepts", [])
            
            validated_concepts = []
            for concept in concepts:
                if self._validate_concept(concept):
                    validated_concepts.append({
                        "text": concept["text"],
                        "confidence": float(concept["confidence"]),
                        "type": NodeType.CONCEPT
                    })
            
            if use_cache:
                self.concept_cache[cache_key] = validated_concepts
            
            logger.info(f"Extracted {len(validated_concepts)} concepts from text")
            return validated_concepts
        except Exception as e:
            logger.error(f"Error extracting concepts: {e}")
            raise
    
    def _validate_concept(self, concept: Dict) -> bool:
        """Validate concept data"""
        if not isinstance(concept, dict):
            return False
        if "text" not in concept or "confidence" not in concept:
            return False
        if not isinstance(concept["text"], str) or len(concept["text"]) == 0:
            return False
        confidence = float(concept["confidence"])
        if confidence < 0.0 or confidence > 1.0:
            return False
        return True
    
    async def disambiguate_concepts(
        self,
        concepts: List[str],
        context: str = ""
    ) -> List[Dict[str, Any]]:
        """Disambiguate similar concepts"""
        try:
            concepts_text = "\n".join([f"- {c}" for c in concepts])
            prompt = f"""
You are an expert at entity disambiguation.

Given these concepts, identify which ones refer to the same entity:

Concepts:
{concepts_text}

Context: {context}

Return a JSON object mapping concepts to their canonical form:

{{
  "mappings": [
    {{"original": "concept1", "canonical": "Concept Name", "confidence": 0.9}}
  ]
}}
"""
            response = await gemini_service.generate_structured_content(prompt)
            mappings = response.get("mappings", [])
            
            logger.info(f"Disambiguated {len(mappings)} concepts")
            return mappings
        except Exception as e:
            logger.error(f"Error disambiguating concepts: {e}")
            return []
    
    def clear_cache(self):
        """Clear concept cache"""
        self.concept_cache.clear()
        logger.info("Concept cache cleared")


concept_extractor = ConceptExtractor()
