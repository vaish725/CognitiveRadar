import pytest
from unittest.mock import AsyncMock, patch
from app.services.concept_extractor import concept_extractor


@pytest.mark.asyncio
async def test_validate_concept():
    valid_concept = {"text": "AI", "confidence": 0.9}
    assert concept_extractor._validate_concept(valid_concept) == True
    
    invalid_concept = {"text": "", "confidence": 0.9}
    assert concept_extractor._validate_concept(invalid_concept) == False
    
    invalid_confidence = {"text": "AI", "confidence": 1.5}
    assert concept_extractor._validate_concept(invalid_confidence) == False


@pytest.mark.asyncio
async def test_concept_cache():
    concept_extractor.clear_cache()
    
    test_text = "Test text for caching"
    mock_concepts = [{"text": "Test", "confidence": 0.9}]
    
    with patch('app.services.gemini_service.gemini_service.generate_structured_content',
               new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = {"concepts": mock_concepts}
        
        result1 = await concept_extractor.extract_concepts(test_text, use_cache=True)
        
        result2 = await concept_extractor.extract_concepts(test_text, use_cache=True)
        
        assert mock_gemini.call_count == 1
        assert len(result1) == len(result2)


def test_clear_cache():
    concept_extractor.concept_cache["test"] = []
    concept_extractor.clear_cache()
    assert len(concept_extractor.concept_cache) == 0
