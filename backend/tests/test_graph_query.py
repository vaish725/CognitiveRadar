import pytest
from app.services.graph_query import graph_query
from app.services.graph_builder import graph_builder
from app.models.graph import NodeType, EdgeType


@pytest.mark.asyncio
async def test_get_node():
    """Test getting a specific node"""
    node = await graph_builder.create_node(
        session_id="test_query",
        node_type=NodeType.CONCEPT,
        text="Test concept",
        metadata={}
    )
    
    retrieved = await graph_query.get_node("test_query", node.node_id)
    
    assert retrieved is not None
    assert retrieved.node_id == node.node_id
    assert retrieved.text == "Test concept"


@pytest.mark.asyncio
async def test_get_node_neighbors():
    """Test getting node neighbors"""
    node1 = await graph_builder.create_node(
        session_id="test_neighbors",
        node_type=NodeType.CLAIM,
        text="Main claim",
        metadata={}
    )
    
    node2 = await graph_builder.create_node(
        session_id="test_neighbors",
        node_type=NodeType.EVIDENCE,
        text="Supporting evidence",
        metadata={}
    )
    
    await graph_builder.create_edge(
        session_id="test_neighbors",
        source_id=node2.node_id,
        target_id=node1.node_id,
        edge_type="supports",
        metadata={}
    )
    
    result = await graph_query.get_node_neighbors(
        session_id="test_neighbors",
        node_id=node1.node_id,
        direction="in"
    )
    
    assert len(result["neighbors"]) > 0


@pytest.mark.asyncio
async def test_find_path():
    """Test pathfinding between nodes"""
    node1 = await graph_builder.create_node(
        session_id="test_path",
        node_type=NodeType.CONCEPT,
        text="Start node",
        metadata={}
    )
    
    node2 = await graph_builder.create_node(
        session_id="test_path",
        node_type=NodeType.CONCEPT,
        text="Middle node",
        metadata={}
    )
    
    node3 = await graph_builder.create_node(
        session_id="test_path",
        node_type=NodeType.CONCEPT,
        text="End node",
        metadata={}
    )
    
    await graph_builder.create_edge(
        session_id="test_path",
        source_id=node1.node_id,
        target_id=node2.node_id,
        edge_type="supports",
        metadata={}
    )
    
    await graph_builder.create_edge(
        session_id="test_path",
        source_id=node2.node_id,
        target_id=node3.node_id,
        edge_type="supports",
        metadata={}
    )
    
    path = await graph_query.find_path(
        session_id="test_path",
        start_node_id=node1.node_id,
        end_node_id=node3.node_id
    )
    
    assert path is not None
    assert len(path) == 3


@pytest.mark.asyncio
async def test_get_subgraph():
    """Test subgraph extraction"""
    center = await graph_builder.create_node(
        session_id="test_subgraph",
        node_type=NodeType.CONCEPT,
        text="Center",
        metadata={}
    )
    
    neighbor = await graph_builder.create_node(
        session_id="test_subgraph",
        node_type=NodeType.CONCEPT,
        text="Neighbor",
        metadata={}
    )
    
    await graph_builder.create_edge(
        session_id="test_subgraph",
        source_id=center.node_id,
        target_id=neighbor.node_id,
        edge_type="supports",
        metadata={}
    )
    
    subgraph = await graph_query.get_subgraph(
        session_id="test_subgraph",
        node_id=center.node_id,
        depth=1
    )
    
    assert len(subgraph["nodes"]) >= 2
    assert len(subgraph["edges"]) >= 1


@pytest.mark.asyncio
async def test_find_contradictions():
    """Test finding contradictions"""
    node1 = await graph_builder.create_node(
        session_id="test_contradictions",
        node_type=NodeType.CLAIM,
        text="AI is beneficial",
        metadata={}
    )
    
    node2 = await graph_builder.create_node(
        session_id="test_contradictions",
        node_type=NodeType.CLAIM,
        text="AI is harmful",
        metadata={}
    )
    
    await graph_builder.create_edge(
        session_id="test_contradictions",
        source_id=node1.node_id,
        target_id=node2.node_id,
        edge_type="contradicts",
        metadata={}
    )
    
    contradictions = await graph_query.find_contradictions("test_contradictions")
    
    assert len(contradictions) > 0


@pytest.mark.asyncio
async def test_get_graph_statistics():
    """Test graph statistics"""
    stats = await graph_query.get_graph_statistics("test_query")
    
    assert "total_nodes" in stats
    assert "total_edges" in stats
    assert "node_types" in stats
