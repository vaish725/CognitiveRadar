from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.thinking_engine import thinking_engine
from app.services.graph_storage import graph_storage

router = APIRouter(prefix="/thinking", tags=["thinking"])


class AnalyzeTextRequest(BaseModel):
    text: str


class AnalyzeGraphRequest(BaseModel):
    context: str


@router.post("/{session_id}/analyze")
async def analyze_graph(session_id: str, request: AnalyzeGraphRequest):
    """Perform comprehensive critical analysis of the graph"""
    graph = await graph_storage.get_graph(session_id)
    
    if not graph:
        raise HTTPException(status_code=404, detail="Session not found")
    
    analysis = await thinking_engine.analyze_graph(
        context=request.context,
        nodes=graph["nodes"],
        edges=graph["edges"]
    )
    
    return analysis


@router.post("/analyze-text")
async def analyze_text(request: AnalyzeTextRequest):
    """Analyze text with critical thinking"""
    analysis = await thinking_engine.analyze_text_critically(request.text)
    
    return analysis


@router.get("/{session_id}/gaps")
async def detect_gaps(session_id: str, context: str = ""):
    """Detect knowledge gaps"""
    from app.services.gap_detector import gap_detector
    
    graph = await graph_storage.get_graph(session_id)
    
    if not graph:
        raise HTTPException(status_code=404, detail="Session not found")
    
    gaps = await gap_detector.detect_gaps(context, graph["nodes"])
    missing_links = await gap_detector.analyze_missing_links(
        graph["nodes"],
        graph["edges"]
    )
    
    claims = [n for n in graph["nodes"] if n.get("node_type") == "claim"]
    incomplete = await gap_detector.identify_incomplete_arguments(
        claims,
        graph["edges"]
    )
    
    return {
        "gaps": gaps,
        "missing_links": missing_links,
        "incomplete_arguments": incomplete
    }


@router.get("/{session_id}/contradictions")
async def detect_contradictions(session_id: str):
    """Detect contradictions in the graph"""
    from app.services.contradiction_detector import contradiction_detector
    
    graph = await graph_storage.get_graph(session_id)
    
    if not graph:
        raise HTTPException(status_code=404, detail="Session not found")
    
    contradictions = await contradiction_detector.detect_contradictions(
        graph["nodes"]
    )
    
    logical_issues = await contradiction_detector.find_logical_inconsistencies(
        graph["nodes"],
        graph["edges"]
    )
    
    return {
        "contradictions": contradictions,
        "logical_issues": logical_issues
    }


@router.get("/{session_id}/assumptions")
async def detect_assumptions(session_id: str):
    """Detect assumptions in claims"""
    from app.services.assumption_detector import assumption_detector
    
    graph = await graph_storage.get_graph(session_id)
    
    if not graph:
        raise HTTPException(status_code=404, detail="Session not found")
    
    claims = [n for n in graph["nodes"] if n.get("node_type") == "claim"]
    
    all_assumptions = []
    for claim in claims[:10]:
        evidence = [
            e for e in graph["edges"]
            if e["target_id"] == claim["node_id"] and e["edge_type"] == "supports"
        ]
        assumptions = await assumption_detector.analyze_claim_assumptions(
            claim["text"],
            [e.get("metadata", {}).get("text", "") for e in evidence]
        )
        all_assumptions.extend(assumptions)
    
    implicit = await assumption_detector.find_implicit_prerequisites(
        graph["nodes"],
        graph["edges"]
    )
    
    return {
        "assumptions": all_assumptions,
        "implicit_prerequisites": implicit
    }


@router.post("/{session_id}/questions")
async def generate_questions(session_id: str, context: str = ""):
    """Generate context-aware questions"""
    from app.services.question_generator import question_generator
    
    graph = await graph_storage.get_graph(session_id)
    
    if not graph:
        raise HTTPException(status_code=404, detail="Session not found")
    
    questions = await question_generator.generate_questions(
        context=context,
        nodes=graph["nodes"]
    )
    
    claims = [n for n in graph["nodes"] if n.get("node_type") == "claim"]
    challenge_questions = await question_generator.generate_challenge_questions(
        claims[:5]
    )
    
    connection_questions = await question_generator.generate_connection_questions(
        graph["nodes"],
        graph["edges"]
    )
    
    return {
        "general_questions": questions,
        "challenge_questions": challenge_questions,
        "connection_questions": connection_questions
    }


@router.get("/{session_id}/weak-points")
async def identify_weak_points(session_id: str):
    """Identify weak points in argumentation"""
    graph = await graph_storage.get_graph(session_id)
    
    if not graph:
        raise HTTPException(status_code=404, detail="Session not found")
    
    weak_points = await thinking_engine.identify_weak_points(
        graph["nodes"],
        graph["edges"]
    )
    
    return {"weak_points": weak_points}


@router.post("/{session_id}/suggestions")
async def suggest_improvements(session_id: str, context: str = ""):
    """Get suggestions for improving the graph"""
    graph = await graph_storage.get_graph(session_id)
    
    if not graph:
        raise HTTPException(status_code=404, detail="Session not found")
    
    suggestions = await thinking_engine.suggest_improvements(
        graph["nodes"],
        graph["edges"],
        context
    )
    
    return {"suggestions": suggestions}
