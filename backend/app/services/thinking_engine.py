from typing import List, Dict, Any
from app.services.gap_detector import gap_detector
from app.services.assumption_detector import assumption_detector
from app.services.contradiction_detector import contradiction_detector
from app.services.question_generator import question_generator
from app.core.logging import get_logger

logger = get_logger(__name__)


class ThinkingEngine:
    """Orchestrate critical thinking operations"""
    
    async def analyze_graph(
        self,
        context: str,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Perform comprehensive critical analysis of the graph
        
        Returns all insights: gaps, assumptions, contradictions, questions
        """
        try:
            logger.info("Starting comprehensive graph analysis")
            
            gaps = await gap_detector.detect_gaps(context, nodes)
            
            missing_links = await gap_detector.analyze_missing_links(nodes, edges)
            
            claims = [n for n in nodes if n.get("node_type") == "claim"]
            incomplete_args = await gap_detector.identify_incomplete_arguments(
                claims, edges
            )
            
            contradictions = await contradiction_detector.detect_contradictions(nodes)
            
            logical_issues = await contradiction_detector.find_logical_inconsistencies(
                nodes, edges
            )
            
            questions = await question_generator.generate_questions(
                context, nodes
            )
            
            all_assumptions = []
            for claim in claims[:5]:
                evidence = [
                    e for e in edges
                    if e["target_id"] == claim["node_id"] and e["edge_type"] == "supports"
                ]
                assumptions = await assumption_detector.analyze_claim_assumptions(
                    claim["text"],
                    [e.get("metadata", {}).get("text", "") for e in evidence]
                )
                all_assumptions.extend(assumptions)
            
            result = {
                "gaps": {
                    "knowledge_gaps": gaps,
                    "missing_links": missing_links,
                    "incomplete_arguments": incomplete_args,
                    "total_count": len(gaps) + len(missing_links) + len(incomplete_args)
                },
                "contradictions": {
                    "direct_contradictions": contradictions,
                    "logical_inconsistencies": logical_issues,
                    "total_count": len(contradictions) + len(logical_issues)
                },
                "assumptions": {
                    "detected": all_assumptions,
                    "total_count": len(all_assumptions)
                },
                "questions": {
                    "generated": questions,
                    "total_count": len(questions)
                },
                "summary": {
                    "total_issues": (
                        len(gaps) + len(missing_links) + len(incomplete_args) +
                        len(contradictions) + len(logical_issues)
                    ),
                    "critical_gaps": len([g for g in gaps if g.get("severity", 0) > 70]),
                    "questionable_assumptions": len([
                        a for a in all_assumptions if a.get("questionable", False)
                    ]),
                    "high_priority_questions": len([
                        q for q in questions if q.get("priority") == "high"
                    ])
                }
            }
            
            logger.info(f"Analysis complete: {result['summary']}")
            return result
        except Exception as e:
            logger.error(f"Error in graph analysis: {e}")
            return {}
    
    async def analyze_text_critically(
        self,
        text: str
    ) -> Dict[str, Any]:
        """
        Analyze text with critical thinking
        """
        try:
            assumptions = await assumption_detector.detect_assumptions(text)
            
            cultural = await assumption_detector.detect_cultural_assumptions(text)
            
            questions = await question_generator.generate_questions(text)
            
            return {
                "assumptions": assumptions,
                "cultural_assumptions": cultural,
                "questions": questions
            }
        except Exception as e:
            logger.error(f"Error in text analysis: {e}")
            return {}
    
    async def identify_weak_points(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Identify weak points in argumentation
        """
        try:
            weak_points = []
            
            claims = [n for n in nodes if n.get("node_type") == "claim"]
            incomplete = await gap_detector.identify_incomplete_arguments(claims, edges)
            
            for issue in incomplete:
                weak_points.append({
                    "type": "weak_support",
                    "severity": issue.get("severity", "medium"),
                    "description": issue["description"],
                    "node_id": issue["claim_id"]
                })
            
            contradictions = await contradiction_detector.detect_contradictions(nodes)
            
            for contradiction in contradictions:
                if contradiction.get("severity") == "high":
                    weak_points.append({
                        "type": "contradiction",
                        "severity": "high",
                        "description": "Direct contradiction detected",
                        "nodes": [
                            contradiction["node1"]["node_id"],
                            contradiction["node2"]["node_id"]
                        ]
                    })
            
            implicit = await assumption_detector.find_implicit_prerequisites(
                nodes, edges
            )
            
            for prereq in implicit:
                if prereq.get("confidence", 0) > 0.7:
                    weak_points.append({
                        "type": "implicit_assumption",
                        "severity": "medium",
                        "description": f"Implicit prerequisite: {prereq['assumption']}",
                        "node_id": prereq["claim_id"]
                    })
            
            weak_points.sort(
                key=lambda x: {"high": 3, "medium": 2, "low": 1}.get(x.get("severity", "low"), 1),
                reverse=True
            )
            
            logger.info(f"Identified {len(weak_points)} weak points")
            return weak_points
        except Exception as e:
            logger.error(f"Error identifying weak points: {e}")
            return []
    
    async def suggest_improvements(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        context: str
    ) -> List[Dict[str, Any]]:
        """
        Suggest improvements to strengthen the graph
        """
        try:
            suggestions = []
            
            gaps = await gap_detector.detect_gaps(context, nodes)
            
            for gap in gaps[:5]:
                if gap.get("severity", 0) > 50:
                    suggestions.append({
                        "type": "fill_gap",
                        "priority": "high" if gap["severity"] > 70 else "medium",
                        "description": f"Address gap: {gap['description']}",
                        "action": "Add more information or evidence"
                    })
            
            claims = [n for n in nodes if n.get("node_type") == "claim"]
            incomplete = await gap_detector.identify_incomplete_arguments(claims, edges)
            
            for issue in incomplete:
                suggestions.append({
                    "type": "strengthen_claim",
                    "priority": issue.get("severity", "medium"),
                    "description": f"Strengthen: {issue['claim'][:100]}...",
                    "action": "Add supporting evidence or reasoning"
                })
            
            contradictions = await contradiction_detector.detect_contradictions(nodes)
            
            for contradiction in contradictions:
                suggestions.append({
                    "type": "resolve_contradiction",
                    "priority": "high",
                    "description": "Resolve contradiction between claims",
                    "action": "Clarify or reconcile conflicting statements"
                })
            
            logger.info(f"Generated {len(suggestions)} improvement suggestions")
            return suggestions
        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return []


thinking_engine = ThinkingEngine()
