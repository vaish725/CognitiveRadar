import pytest
from unittest.mock import AsyncMock, patch
from app.services.claim_extractor import claim_extractor


@pytest.mark.asyncio
async def test_validate_claim():
    valid_claim = {"text": "AI is useful", "confidence": 0.85}
    assert claim_extractor._validate_claim(valid_claim) == True
    
    invalid_claim = {"text": "", "confidence": 0.85}
    assert claim_extractor._validate_claim(invalid_claim) == False
    
    invalid_confidence = {"text": "AI is useful", "confidence": -0.1}
    assert claim_extractor._validate_claim(invalid_confidence) == False


def test_claim_history():
    claim_extractor.clear_history()
    
    test_claim = {
        "text": "Test claim",
        "confidence": 0.9,
        "timestamp": 12345
    }
    
    claim_extractor._add_to_history(test_claim)
    
    recent = claim_extractor.get_recent_claims(limit=10)
    assert len(recent) == 1
    assert recent[0]["text"] == "Test claim"


def test_clear_history():
    claim_extractor._add_to_history({"text": "test", "confidence": 0.9, "timestamp": 123})
    claim_extractor.clear_history()
    assert len(claim_extractor.claim_history) == 0
