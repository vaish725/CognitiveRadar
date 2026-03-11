import pytest
from app.services.thinking_engine import thinking_engine
from app.models.graph import NodeType


@pytest.mark.asyncio
async def test_analyze_graph():
    """Test comprehensive graph analysis"""
    context = "AI and machine learning applications"
    nodes = [
        {
            "node_id": "1",
            "node_type": NodeType.CONCEPT.value,
            "text": "Machine learning"
        },
        {
            "node_id": "2",
            "node_type": NodeType.CLAIM.value,
            "text": "ML improves decision making"
        }
    ]
    edges = []
    
    analysis = await thinking_engine.analyze_graph(context, nodes, edges)
    
    assert "gaps" in analysis
    assert "contradictions" in analysis
    assert "assumptions" in analysis
    assert "questions" in analysis
    assert "summary" in analysis


@pytest.mark.asyncio
async def test_analyze_text_critically():
    """Test critical text analysis"""
    text = "Everyone knows that technology always improves lives"
    
    analysis = await thinking_engine.analyze_text_critically(text)
    
    assert "assumptions" in analysis
    assert "questions" in analysis


@pytest.mark.asyncio
async def test_identify_weak_points():
    """Test weak point identification"""
    nodes = [
        {
            "node_id": "1",
            "node_type": NodeType.CLAIM.value,
            "text": "AI will solve climate change"
        }
    ]
    edges = []
    
    weak_points = await thinking_engine.identify_weak_points(nodes, edges)
    
    assert isinstance(weak_points, list)


@pytest.mark.asyncio
async def test_suggest_improvements():
    """Test improvement suggestions"""
    context = "AI capabilities"
    nodes = [
        {
            "node_id": "1",
            "node_type": NodeType.CLAIM.value,
            "text": "AI is powerful"
        }
    ]
    edges = []
    
    suggestions = await thinking_engine.suggest_improvements(
        nodes,
        edges,
        context
    )
    
    assert isinstance(suggestions, list)
