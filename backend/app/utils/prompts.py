from typing import Dict, Any


class PromptVersion:
    """Prompt versioning system"""
    VERSION = "1.0.0"


class PromptTemplates:
    """Prompt templates for Gemini AI with few-shot examples"""
    
    @staticmethod
    def concept_extraction(text: str) -> str:
        return f"""
You are an expert at extracting key concepts from text.

Analyze the following text and extract important concepts, entities, and topics.
Return a JSON array of concepts with their confidence scores.

Example:
Text: "Artificial intelligence and machine learning are transforming healthcare by enabling early disease detection."

Output:
{{
  "concepts": [
    {{"text": "Artificial Intelligence", "confidence": 0.95}},
    {{"text": "Machine Learning", "confidence": 0.95}},
    {{"text": "Healthcare", "confidence": 0.90}},
    {{"text": "Disease Detection", "confidence": 0.85}}
  ]
}}

Now analyze this text:
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

Example:
Text: "Studies show that regular exercise improves cognitive function. However, the optimal duration remains unclear."

Output:
{{
  "claims": [
    {{"text": "Regular exercise improves cognitive function", "confidence": 0.9}},
    {{"text": "The optimal exercise duration for cognitive benefits is unclear", "confidence": 0.85}}
  ]
}}

Now analyze this text:
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

Example:
Statement 1: "Exercise improves health"
Statement 2: "Running reduces cardiovascular disease risk"

Output:
{{
  "has_relationship": true,
  "relationship_type": "supports",
  "confidence": 0.85,
  "explanation": "Running is a form of exercise that provides evidence for the health benefits claim"
}}

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

Example:
Claims:
- Electric cars reduce emissions
- We should adopt electric cars widely

Output:
{{
  "gaps": [
    {{
      "title": "Missing assumption about electricity source",
      "description": "The claim assumes clean electricity generation, but doesn't account for coal-powered grids",
      "severity": 0.7,
      "related_claims": ["Electric cars reduce emissions"]
    }}
  ]
}}

Now analyze these claims:
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

Example:
Claims:
- AI will create more jobs than it eliminates
- AI will lead to mass unemployment

Output:
{{
  "contradictions": [
    {{
      "title": "Conflicting predictions about AI employment impact",
      "description": "These claims present opposite outcomes for employment",
      "severity": 0.8,
      "conflicting_claims": ["AI will create more jobs than it eliminates", "AI will lead to mass unemployment"]
    }}
  ]
}}

Now analyze these claims:
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

Example:
Claim: "We should invest in renewable energy"
Context: "Discussion about energy policy"

Output:
{{
  "assumptions": [
    {{
      "text": "Renewable energy is economically viable",
      "confidence": 0.85,
      "explanation": "The claim assumes renewable energy can be deployed at scale economically"
    }},
    {{
      "text": "Current energy sources are problematic",
      "confidence": 0.80,
      "explanation": "The recommendation implies issues with existing energy infrastructure"
    }}
  ]
}}

Now analyze this claim:
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
