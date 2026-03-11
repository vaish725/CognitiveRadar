import pytest
from fastapi.testclient import TestClient
from app.services.connection_manager import connection_manager


def test_connection_manager_initialization():
    """Test connection manager initialization"""
    assert connection_manager.active_connections == {}
    assert connection_manager.connection_sessions == {}


def test_get_total_connections():
    """Test getting total connections"""
    total = connection_manager.get_total_connections()
    assert isinstance(total, int)
    assert total >= 0


def test_is_session_active():
    """Test session active check"""
    is_active = connection_manager.is_session_active("test_session")
    assert isinstance(is_active, bool)


def test_get_session_connection_count():
    """Test getting session connection count"""
    count = connection_manager.get_session_connection_count("test_session")
    assert isinstance(count, int)
    assert count >= 0
