import pytest
from app.services.stream_processor import stream_processor


@pytest.mark.asyncio
async def test_start_stream():
    """Test starting stream"""
    await stream_processor.start_stream("test_session")
    
    status = stream_processor.get_stream_status("test_session")
    assert status["is_active"] is True


@pytest.mark.asyncio
async def test_stop_stream():
    """Test stopping stream"""
    await stream_processor.start_stream("test_session")
    await stream_processor.stop_stream("test_session")
    
    status = stream_processor.get_stream_status("test_session")
    assert status["is_active"] is False


@pytest.mark.asyncio
async def test_process_node_addition():
    """Test processing node addition"""
    await stream_processor.start_stream("test_session")
    
    node = {"node_id": "1", "text": "test", "node_type": "concept"}
    await stream_processor.process_node_addition("test_session", node)
    
    await stream_processor.stop_stream("test_session")


@pytest.mark.asyncio
async def test_process_edge_addition():
    """Test processing edge addition"""
    await stream_processor.start_stream("test_session")
    
    edge = {
        "edge_id": "1",
        "source_id": "1",
        "target_id": "2",
        "edge_type": "supports"
    }
    await stream_processor.process_edge_addition("test_session", edge)
    
    await stream_processor.stop_stream("test_session")


@pytest.mark.asyncio
async def test_process_batch_updates():
    """Test processing batch updates"""
    await stream_processor.start_stream("test_session")
    
    nodes = [
        {"node_id": "1", "text": "node1", "node_type": "concept"},
        {"node_id": "2", "text": "node2", "node_type": "claim"}
    ]
    
    edges = [
        {
            "edge_id": "1",
            "source_id": "1",
            "target_id": "2",
            "edge_type": "supports"
        }
    ]
    
    await stream_processor.process_batch_updates("test_session", nodes, edges)
    
    await stream_processor.stop_stream("test_session")


@pytest.mark.asyncio
async def test_process_insight():
    """Test processing insight"""
    await stream_processor.start_stream("test_session")
    
    insight = {"type": "gap", "description": "Missing link"}
    await stream_processor.process_insight(
        session_id="test_session",
        insight_type="gap",
        insight=insight
    )
    
    await stream_processor.stop_stream("test_session")


def test_get_stream_status():
    """Test getting stream status"""
    status = stream_processor.get_stream_status("test_session")
    
    assert "is_active" in status
    assert "buffer_size" in status
    assert "queue_size" in status
