from typing import Dict, Any


class PromptTemplates:
    """Prompt templates for Gemini AI"""
    
    @staticmethod
    def concept_extraction(text: str) -> str:
        return f"""
You are an expert at extracting key concepts from text.

Analyze the following text and extract important concepts, entities, and topics.
Return a JSON array of concepts with their confidence scores.

Text: {text}

Format:
{{
  "concepts": [
    {{"text": "concept name", "confidence": 0.95}}
  ]
}}
"""

    @staticmethod
    def claim_extraction(text: str) -> str:
        return f"""
You are an expert at identifying claims and statements in text.

Analyze the following text and extract explicit claims or assertions.
A claim is a statement that asserts something as true or makes a proposition.

Text: {text}

Format:
{{
  "claims": [
    {{"text": "claim text", "confidence": 0.9}}
  ]
}}
"""

    @staticmethod
    def relationship_detection(source_text: str, target_text: str, context: str = "") -> str:
        return f"""
You are an expert at detecting logical relationships between ideas.

Analyze the relationship between these two statements:

Statement 1: {source_text}
Statement 2: {target_text}
Context: {context}

Determine if there is a relationship and what type:
- supports: Statement 2 provides evidence for Statement 1
- contradicts: Statement 2 conflicts with Statement 1
- depends_on: Statement 1 requires Statement 2 to be true
- example_of: Statement 2 is an example of Statement 1

Format:
{{
  "has_relationship": true/false,
  "relationship_type": "supports|contradicts|depends_on|example_of",
  "confidence": 0.85,
  "explanation": "brief explanation"
}}
"""

    @staticmethod
    def gap_detection(claims: list) -> str:
        claims_text = "\n".join([f"- {claim}" for claim in claims])
        return f"""
You are an expert at identifying logical gaps in arguments.

Analyze these claims and identify missing assumptions, weak evidence, or incomplete reasoning:

Claims:
{claims_text}

Format:
{{
  "gaps": [
    {{
      "title": "Gap title",
      "description": "What is missing",
      "severity": 0.7,
      "related_claims": ["claim text"]
    }}
  ]
}}
"""

    @staticmethod
    def contradiction_detection(claims: list) -> str:
        claims_text = "\n".join([f"- {claim}" for claim in claims])
        return f"""
You are an expert at detecting contradictions in reasoning.

Analyze these claims and identify any logical contradictions or conflicts:

Claims:
{claims_text}

Format:
{{
  "contradictions": [
    {{
      "title": "Contradiction title",
      "description": "Description of the conflict",
      "severity": 0.8,
      "conflicting_claims": ["claim 1", "claim 2"]
    }}
  ]
}}
"""

    @staticmethod
    def assumption_detection(claim: str, context: str = "") -> str:
        return f"""
You are an expert at identifying hidden assumptions in arguments.

Analyze this claim and identify underlying assumptions that are not explicitly stated:

Claim: {claim}
Context: {context}

Format:
{{
  "assumptions": [
    {{
      "text": "assumption text",
      "confidence": 0.85,
      "explanation": "why this is an assumption"
    }}
  ]
}}
"""
