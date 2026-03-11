import pytest
from app.services.gap_detector import gap_detector
from app.models.graph import NodeType


@pytest.mark.asyncio
async def test_detect_gaps():
    """Test gap detection"""
    context = "Machine learning uses algorithms to learn from data"
    nodes = [
        {
            "node_id": "1",
            "node_type": NodeType.CONCEPT.value,
            "text": "Machine learning"
        },
        {
            "node_id": "2",
            "node_type": NodeType.CLAIM.value,
            "text": "ML requires large datasets"
        }
    ]
    
    gaps = await gap_detector.detect_gaps(context, nodes)
    
    assert isinstance(gaps, list)


@pytest.mark.asyncio
async def test_analyze_missing_links():
    """Test missing link analysis"""
    nodes = [
        {
            "node_id": "1",
            "node_type": NodeType.CONCEPT.value,
            "text": "Neural networks"
        },
        {
            "node_id": "2",
            "node_type": NodeType.CONCEPT.value,
            "text": "Deep learning"
        }
    ]
    
    edges = []
    
    missing = await gap_detector.analyze_missing_links(nodes, edges)
    
    assert isinstance(missing, list)


@pytest.mark.asyncio
async def test_identify_incomplete_arguments():
    """Test incomplete argument identification"""
    claims = [
        {
            "node_id": "1",
            "node_type": NodeType.CLAIM.value,
            "text": "AI will revolutionize healthcare"
        }
    ]
    
    edges = []
    
    incomplete = await gap_detector.identify_incomplete_arguments(claims, edges)
    
    assert len(incomplete) > 0
    assert incomplete[0]["gap_type"] == "unsupported_claim"
