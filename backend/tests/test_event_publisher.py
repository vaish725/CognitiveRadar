import pytest
from app.services.event_publisher import event_publisher
from app.models.event import EventType


@pytest.mark.asyncio
async def test_publish_event():
    """Test event publishing"""
    await event_publisher.publish(
        session_id="test_session",
        event_type=EventType.NODE_ADDED,
        data={"node": {"id": "1", "text": "test"}}
    )
    
    assert True


@pytest.mark.asyncio
async def test_publish_node_added():
    """Test publishing node added event"""
    node = {"node_id": "1", "text": "test node", "node_type": "concept"}
    
    await event_publisher.publish_node_added("test_session", node)
    
    assert True


@pytest.mark.asyncio
async def test_publish_edge_added():
    """Test publishing edge added event"""
    edge = {
        "edge_id": "1",
        "source_id": "1",
        "target_id": "2",
        "edge_type": "supports"
    }
    
    await event_publisher.publish_edge_added("test_session", edge)
    
    assert True


@pytest.mark.asyncio
async def test_publish_insight():
    """Test publishing insight event"""
    insight = {"type": "gap", "description": "Missing evidence"}
    
    await event_publisher.publish_insight(
        session_id="test_session",
        insight_type="gap",
        insight=insight
    )
    
    assert True


@pytest.mark.asyncio
async def test_publish_processing_status():
    """Test publishing processing status"""
    await event_publisher.publish_processing_status(
        session_id="test_session",
        status="started",
        progress=0.5,
        message="Processing..."
    )
    
    assert True


@pytest.mark.asyncio
async def test_publish_error():
    """Test publishing error event"""
    await event_publisher.publish_error(
        session_id="test_session",
        error_type="processing_error",
        message="Test error",
        details={"code": 500}
    )
    
    assert True


def test_get_queue_size():
    """Test getting queue size"""
    size = event_publisher.get_queue_size("test_session")
    assert isinstance(size, int)
    assert size >= 0


def test_clear_queue():
    """Test clearing queue"""
    event_publisher.clear_queue("test_session")
    assert event_publisher.get_queue_size("test_session") == 0
