from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from app.services.extraction_engine import extraction_engine
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/extract", tags=["extraction"])


class ExtractionRequest(BaseModel):
    text: str
    session_id: str
    extract_concepts: bool = True
    extract_claims: bool = True
    detect_relationships: bool = True


class ChunkedExtractionRequest(BaseModel):
    chunks: List[str]
    session_id: str
    merge_results: bool = True


class ExtractionResponse(BaseModel):
    session_id: str
    concepts: List[dict]
    claims: List[dict]
    relationships: List[dict]
    total_elements: int


@router.post("/text", response_model=ExtractionResponse)
async def extract_from_text(request: ExtractionRequest):
    """Extract concepts, claims, and relationships from text"""
    try:
        result = await extraction_engine.process_text(
            text=request.text,
            extract_concepts=request.extract_concepts,
            extract_claims=request.extract_claims,
            detect_relationships=request.detect_relationships
        )
        
        total = len(result["concepts"]) + len(result["claims"]) + len(result["relationships"])
        
        return ExtractionResponse(
            session_id=request.session_id,
            concepts=result["concepts"],
            claims=result["claims"],
            relationships=result["relationships"],
            total_elements=total
        )
    except Exception as e:
        logger.error(f"Error in extraction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {str(e)}"
        )


@router.post("/chunks", response_model=ExtractionResponse)
async def extract_from_chunks(request: ChunkedExtractionRequest):
    """Extract from multiple text chunks"""
    try:
        result = await extraction_engine.process_text_chunks(
            chunks=request.chunks,
            merge_results=request.merge_results
        )
        
        if request.merge_results:
            total = len(result["concepts"]) + len(result["claims"]) + len(result["relationships"])
            
            return ExtractionResponse(
                session_id=request.session_id,
                concepts=result["concepts"],
                claims=result["claims"],
                relationships=result["relationships"],
                total_elements=total
            )
        else:
            total = sum(
                len(chunk["concepts"]) + len(chunk["claims"]) + len(chunk["relationships"])
                for chunk in result["chunks"]
            )
            
            all_concepts = []
            all_claims = []
            all_relationships = []
            
            for chunk in result["chunks"]:
                all_concepts.extend(chunk["concepts"])
                all_claims.extend(chunk["claims"])
                all_relationships.extend(chunk["relationships"])
            
            return ExtractionResponse(
                session_id=request.session_id,
                concepts=all_concepts,
                claims=all_claims,
                relationships=all_relationships,
                total_elements=total
            )
    except Exception as e:
        logger.error(f"Error in chunked extraction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {str(e)}"
        )
