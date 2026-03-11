import pytest
from app.services.question_generator import question_generator
from app.models.graph import NodeType


@pytest.mark.asyncio
async def test_generate_questions():
    """Test question generation"""
    context = "Machine learning is transforming industries"
    nodes = [
        {
            "node_id": "1",
            "node_type": NodeType.CONCEPT.value,
            "text": "Machine learning"
        }
    ]
    
    questions = await question_generator.generate_questions(context, nodes)
    
    assert isinstance(questions, list)


@pytest.mark.asyncio
async def test_generate_clarification_questions():
    """Test clarification question generation"""
    ambiguous_nodes = [
        {
            "node_id": "1",
            "node_type": NodeType.CONCEPT.value,
            "text": "It improves efficiency"
        }
    ]
    
    questions = await question_generator.generate_clarification_questions(
        ambiguous_nodes
    )
    
    assert isinstance(questions, list)


@pytest.mark.asyncio
async def test_generate_challenge_questions():
    """Test challenge question generation"""
    claims = [
        {
            "node_id": "1",
            "node_type": NodeType.CLAIM.value,
            "text": "AI will solve all problems"
        }
    ]
    
    questions = await question_generator.generate_challenge_questions(claims)
    
    assert isinstance(questions, list)


@pytest.mark.asyncio
async def test_generate_connection_questions():
    """Test connection question generation"""
    nodes = [
        {
            "node_id": "1",
            "node_type": NodeType.CONCEPT.value,
            "text": "Neural networks"
        },
        {
            "node_id": "2",
            "node_type": NodeType.CONCEPT.value,
            "text": "Quantum computing"
        }
    ]
    
    edges = []
    
    questions = await question_generator.generate_connection_questions(
        nodes,
        edges
    )
    
    assert isinstance(questions, list)


@pytest.mark.asyncio
async def test_generate_implication_questions():
    """Test implication question generation"""
    claims = [
        {
            "node_id": "1",
            "node_type": NodeType.CLAIM.value,
            "text": "Automation will replace human jobs"
        }
    ]
    
    questions = await question_generator.generate_implication_questions(claims)
    
    assert isinstance(questions, list)
