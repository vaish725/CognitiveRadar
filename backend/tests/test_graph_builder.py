import pytest
from app.services.graph_builder import graph_builder
from app.models.graph import NodeType


@pytest.mark.asyncio
async def test_create_node():
    """Test node creation"""
    node = await graph_builder.create_node(
        session_id="test_session",
        node_type=NodeType.CONCEPT,
        text="Machine learning",
        metadata={"source": "test"}
    )
    
    assert node is not None
    assert node.node_type == NodeType.CONCEPT
    assert node.text == "Machine learning"


@pytest.mark.asyncio
async def test_duplicate_node_detection():
    """Test duplicate node detection"""
    node1 = await graph_builder.create_node(
        session_id="test_dup",
        node_type=NodeType.CONCEPT,
        text="Neural networks are computational models",
        metadata={}
    )
    
    node2 = await graph_builder.create_node(
        session_id="test_dup",
        node_type=NodeType.CONCEPT,
        text="Neural networks are models for computation",
        metadata={}
    )
    
    assert node1.node_id == node2.node_id


@pytest.mark.asyncio
async def test_create_edge():
    """Test edge creation"""
    source = await graph_builder.create_node(
        session_id="test_edge",
        node_type=NodeType.CLAIM,
        text="AI improves productivity",
        metadata={}
    )
    
    target = await graph_builder.create_node(
        session_id="test_edge",
        node_type=NodeType.EVIDENCE,
        text="Studies show 30% efficiency gains",
        metadata={}
    )
    
    edge = await graph_builder.create_edge(
        session_id="test_edge",
        source_id=source.node_id,
        target_id=target.node_id,
        edge_type="supports",
        metadata={}
    )
    
    assert edge is not None
    assert edge.source_id == source.node_id
    assert edge.target_id == target.node_id


@pytest.mark.asyncio
async def test_create_graph_from_extraction():
    """Test graph creation from extraction results"""
    extraction_result = {
        "nodes": [
            {
                "type": "concept",
                "text": "Deep learning",
                "metadata": {"confidence": 0.9}
            },
            {
                "type": "claim",
                "text": "Deep learning requires large datasets",
                "metadata": {"confidence": 0.85}
            }
        ],
        "edges": [
            {
                "source_text": "Deep learning",
                "target_text": "Deep learning requires large datasets",
                "type": "depends_on",
                "metadata": {}
            }
        ]
    }
    
    result = await graph_builder.create_graph_from_extraction(
        session_id="test_full",
        extraction_result=extraction_result
    )
    
    assert len(result["nodes"]) == 2
    assert len(result["edges"]) == 1
