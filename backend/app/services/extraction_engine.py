from typing import List, Dict, Any, Optional
from app.services.concept_extractor import concept_extractor
from app.services.claim_extractor import claim_extractor
from app.services.relationship_detector import relationship_detector
from app.core.logging import get_logger

logger = get_logger(__name__)


class ExtractionEngine:
    """Orchestrate extraction of concepts, claims, and relationships"""
    
    async def process_text(
        self,
        text: str,
        extract_concepts: bool = True,
        extract_claims: bool = True,
        detect_relationships: bool = True
    ) -> Dict[str, Any]:
        """Process text and extract all elements"""
        try:
            result = {
                "concepts": [],
                "claims": [],
                "relationships": []
            }
            
            if extract_concepts:
                logger.info("Extracting concepts...")
                result["concepts"] = await concept_extractor.extract_concepts(text)
            
            if extract_claims:
                logger.info("Extracting claims...")
                result["claims"] = await claim_extractor.extract_claims(text)
            
            if detect_relationships and (result["concepts"] or result["claims"]):
                logger.info("Detecting relationships...")
                all_nodes = result["concepts"] + result["claims"]
                result["relationships"] = await relationship_detector.batch_detect_relationships(
                    all_nodes,
                    max_comparisons=30
                )
            
            logger.info(f"Extraction complete: {len(result['concepts'])} concepts, "
                       f"{len(result['claims'])} claims, {len(result['relationships'])} relationships")
            
            return result
        except Exception as e:
            logger.error(f"Error in extraction engine: {e}")
            raise
    
    async def process_text_chunks(
        self,
        chunks: List[str],
        merge_results: bool = True
    ) -> Dict[str, Any]:
        """Process multiple text chunks"""
        try:
            all_results = []
            
            for i, chunk in enumerate(chunks):
                logger.info(f"Processing chunk {i+1}/{len(chunks)}")
                result = await self.process_text(chunk)
                all_results.append(result)
            
            if merge_results:
                return self._merge_results(all_results)
            
            return {"chunks": all_results}
        except Exception as e:
            logger.error(f"Error processing text chunks: {e}")
            raise
    
    def _merge_results(self, results: List[Dict]) -> Dict[str, Any]:
        """Merge results from multiple chunks"""
        merged = {
            "concepts": [],
            "claims": [],
            "relationships": []
        }
        
        seen_texts = set()
        
        for result in results:
            for concept in result.get("concepts", []):
                text = concept["text"].lower()
                if text not in seen_texts:
                    merged["concepts"].append(concept)
                    seen_texts.add(text)
            
            for claim in result.get("claims", []):
                merged["claims"].append(claim)
            
            for rel in result.get("relationships", []):
                merged["relationships"].append(rel)
        
        logger.info(f"Merged results: {len(merged['concepts'])} unique concepts, "
                   f"{len(merged['claims'])} claims, {len(merged['relationships'])} relationships")
        
        return merged
    
    async def enrich_graph(
        self,
        existing_nodes: List[Dict],
        new_text: str
    ) -> Dict[str, Any]:
        """Extract new elements and relate to existing graph"""
        try:
            result = await self.process_text(new_text)
            
            if existing_nodes:
                logger.info("Detecting relationships with existing nodes...")
                new_nodes = result["concepts"] + result["claims"]
                
                for new_node in new_nodes[:10]:
                    for existing_node in existing_nodes[-20:]:
                        relationship = await relationship_detector.detect_relationships(
                            new_node["text"],
                            existing_node["text"]
                        )
                        
                        if relationship:
                            result["relationships"].append({
                                "source": new_node["text"],
                                "target": existing_node["text"],
                                "type": relationship["type"],
                                "confidence": relationship["confidence"]
                            })
            
            return result
        except Exception as e:
            logger.error(f"Error enriching graph: {e}")
            raise


extraction_engine = ExtractionEngine()
