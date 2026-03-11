import pytest
from app.services.contradiction_detector import contradiction_detector
from app.models.graph import NodeType


@pytest.mark.asyncio
async def test_detect_contradictions():
    """Test contradiction detection"""
    nodes = [
        {
            "node_id": "1",
            "node_type": NodeType.CLAIM.value,
            "text": "AI is always beneficial"
        },
        {
            "node_id": "2",
            "node_type": NodeType.CLAIM.value,
            "text": "AI is never beneficial"
        }
    ]
    
    contradictions = await contradiction_detector.detect_contradictions(nodes)
    
    assert isinstance(contradictions, list)


@pytest.mark.asyncio
async def test_analyze_semantic_contradictions():
    """Test semantic contradiction analysis"""
    text1 = "Climate change is accelerating"
    text2 = "Global warming is slowing down"
    
    analysis = await contradiction_detector.analyze_semantic_contradictions(
        text1,
        text2
    )
    
    assert "is_contradictory" in analysis
    assert "type" in analysis


@pytest.mark.asyncio
async def test_find_logical_inconsistencies():
    """Test logical inconsistency detection"""
    nodes = [
        {
            "node_id": "1",
            "node_type": NodeType.CLAIM.value,
            "text": "Test claim"
        }
    ]
    
    edges = [
        {
            "source_id": "2",
            "target_id": "1",
            "edge_type": "supports"
        },
        {
            "source_id": "3",
            "target_id": "1",
            "edge_type": "contradicts"
        }
    ]
    
    issues = await contradiction_detector.find_logical_inconsistencies(
        nodes,
        edges
    )
    
    assert isinstance(issues, list)
