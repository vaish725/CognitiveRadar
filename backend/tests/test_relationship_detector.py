import pytest
from app.services.relationship_detector import relationship_detector
from app.models import EdgeType


def test_validate_relationship_type():
    assert relationship_detector._validate_relationship_type("supports") == True
    assert relationship_detector._validate_relationship_type("contradicts") == True
    assert relationship_detector._validate_relationship_type("invalid") == False


@pytest.mark.asyncio
async def test_validate_relationship_type_enum():
    for edge_type in EdgeType:
        assert relationship_detector._validate_relationship_type(edge_type.value) == True
