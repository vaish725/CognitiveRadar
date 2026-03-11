import pytest
from app.services.assumption_detector import assumption_detector


@pytest.mark.asyncio
async def test_detect_assumptions():
    """Test assumption detection"""
    text = "Everyone knows that AI is beneficial for society"
    
    assumptions = await assumption_detector.detect_assumptions(text)
    
    assert isinstance(assumptions, list)


@pytest.mark.asyncio
async def test_analyze_claim_assumptions():
    """Test claim assumption analysis"""
    claim = "Self-driving cars will reduce accidents"
    evidence = ["Studies show automation improves safety"]
    
    assumptions = await assumption_detector.analyze_claim_assumptions(
        claim,
        evidence
    )
    
    assert isinstance(assumptions, list)


@pytest.mark.asyncio
async def test_detect_cultural_assumptions():
    """Test cultural assumption detection"""
    text = "The Western approach to problem-solving is superior"
    
    assumptions = await assumption_detector.detect_cultural_assumptions(text)
    
    assert isinstance(assumptions, list)
