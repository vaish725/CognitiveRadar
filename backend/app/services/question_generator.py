from typing import List, Dict, Any
from app.services.gemini_service import gemini_service
from app.utils.prompts import PromptTemplates
from app.core.logging import get_logger
from app.models.graph import Node, NodeType

logger = get_logger(__name__)


class QuestionGenerator:
    """Generate context-aware questions"""
    
    def __init__(self):
        self.prompts = PromptTemplates()
    
    async def generate_questions(
        self,
        context: str,
        nodes: List[Dict[str, Any]] = None,
        question_types: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate questions based on context
        
        Args:
            context: Text to generate questions from
            nodes: Existing graph nodes for context
            question_types: Types of questions to generate
        """
        try:
            concepts = []
            claims = []
            
            if nodes:
                concepts = [n["text"] for n in nodes if n.get("node_type") == NodeType.CONCEPT.value]
                claims = [n["text"] for n in nodes if n.get("node_type") == NodeType.CLAIM.value]
            
            prompt = f"""Generate insightful questions about this content:

Context: {context}

Existing concepts: {', '.join(concepts[:10]) if concepts else 'None'}
Existing claims: {', '.join(claims[:5]) if claims else 'None'}

Generate questions that:
- Probe deeper understanding
- Challenge assumptions
- Explore implications
- Identify gaps
- Connect ideas

Return JSON with:
{{
    "questions": [
        {{
            "text": "question text",
            "type": "clarification|challenge|exploration|connection|implication",
            "purpose": "why this question matters",
            "priority": "high|medium|low"
        }}
    ]
}}"""
            
            result = await gemini_service.generate_structured_content(prompt)
            
            if not result or "questions" not in result:
                logger.warning("No questions generated")
                return []
            
            questions = []
            for q in result["questions"]:
                if self._validate_question(q):
                    if not question_types or q.get("type") in question_types:
                        questions.append(q)
            
            logger.info(f"Generated {len(questions)} questions")
            return questions
        except Exception as e:
            logger.error(f"Error generating questions: {e}")
            return []
    
    async def generate_clarification_questions(
        self,
        ambiguous_nodes: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate questions to clarify ambiguous content
        """
        try:
            questions = []
            
            for node in ambiguous_nodes:
                prompt = f"""This concept/claim is ambiguous:

"{node['text']}"

Generate 2-3 clarification questions that would help understand it better.

Return JSON with:
{{
    "questions": [
        {{
            "text": "question text",
            "aspect": "what aspect needs clarification"
        }}
    ]
}}"""
                
                result = await gemini_service.generate_structured_content(prompt)
                
                if result and "questions" in result:
                    for q in result["questions"]:
                        q["node_id"] = node["node_id"]
                        q["type"] = "clarification"
                        questions.append(q)
            
            logger.info(f"Generated {len(questions)} clarification questions")
            return questions
        except Exception as e:
            logger.error(f"Error generating clarification questions: {e}")
            return []
    
    async def generate_challenge_questions(
        self,
        claims: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate questions that challenge claims
        """
        try:
            questions = []
            
            for claim in claims:
                prompt = f"""Challenge this claim critically:

Claim: "{claim['text']}"

Generate 2-3 questions that:
- Challenge underlying assumptions
- Question evidence
- Explore counter-arguments
- Test logical validity

Return JSON with:
{{
    "questions": [
        {{
            "text": "question text",
            "challenge_type": "assumption|evidence|logic|alternative"
        }}
    ]
}}"""
                
                result = await gemini_service.generate_structured_content(prompt)
                
                if result and "questions" in result:
                    for q in result["questions"]:
                        q["claim_id"] = claim["node_id"]
                        q["type"] = "challenge"
                        questions.append(q)
            
            logger.info(f"Generated {len(questions)} challenge questions")
            return questions
        except Exception as e:
            logger.error(f"Error generating challenge questions: {e}")
            return []
    
    async def generate_connection_questions(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate questions about connections between concepts
        """
        try:
            questions = []
            
            node_dict = {n["node_id"]: n for n in nodes}
            
            unconnected_pairs = []
            connected_ids = set()
            
            for edge in edges:
                connected_ids.add((edge["source_id"], edge["target_id"]))
                connected_ids.add((edge["target_id"], edge["source_id"]))
            
            concepts = [n for n in nodes if n.get("node_type") == NodeType.CONCEPT.value]
            
            for i, node1 in enumerate(concepts[:10]):
                for node2 in concepts[i+1:i+6]:
                    if (node1["node_id"], node2["node_id"]) not in connected_ids:
                        unconnected_pairs.append((node1, node2))
            
            for node1, node2 in unconnected_pairs[:5]:
                prompt = f"""Generate a question exploring potential connections:

Concept 1: {node1['text']}
Concept 2: {node2['text']}

Generate a question that explores how these concepts might relate.

Return JSON with:
{{
    "question": "question text"
}}"""
                
                result = await gemini_service.generate_structured_content(prompt)
                
                if result and "question" in result:
                    questions.append({
                        "text": result["question"],
                        "type": "connection",
                        "node1_id": node1["node_id"],
                        "node2_id": node2["node_id"]
                    })
            
            logger.info(f"Generated {len(questions)} connection questions")
            return questions
        except Exception as e:
            logger.error(f"Error generating connection questions: {e}")
            return []
    
    async def generate_implication_questions(
        self,
        claims: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate questions about implications
        """
        try:
            questions = []
            
            for claim in claims[:10]:
                prompt = f"""Explore implications of this claim:

Claim: "{claim['text']}"

Generate 2 questions about:
- Practical implications
- Logical consequences
- Broader impact

Return JSON with:
{{
    "questions": [
        {{
            "text": "question text",
            "implication_type": "practical|logical|social|ethical"
        }}
    ]
}}"""
                
                result = await gemini_service.generate_structured_content(prompt)
                
                if result and "questions" in result:
                    for q in result["questions"]:
                        q["claim_id"] = claim["node_id"]
                        q["type"] = "implication"
                        questions.append(q)
            
            logger.info(f"Generated {len(questions)} implication questions")
            return questions
        except Exception as e:
            logger.error(f"Error generating implication questions: {e}")
            return []
    
    def _validate_question(self, question: Dict[str, Any]) -> bool:
        """Validate question structure"""
        return (
            "text" in question and
            len(question["text"]) > 10 and
            "?" in question["text"]
        )


question_generator = QuestionGenerator()
