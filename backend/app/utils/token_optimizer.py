from typing import List
from app.core.logging import get_logger

logger = get_logger(__name__)


class TokenOptimizer:
    """Optimize token usage for LLM calls"""
    
    @staticmethod
    def truncate_text(text: str, max_tokens: int = 2000) -> str:
        """Truncate text to approximate token limit"""
        chars_per_token = 4
        max_chars = max_tokens * chars_per_token
        
        if len(text) <= max_chars:
            return text
        
        truncated = text[:max_chars]
        
        last_period = truncated.rfind('.')
        last_newline = truncated.rfind('\n')
        break_point = max(last_period, last_newline)
        
        if break_point > 0:
            truncated = truncated[:break_point + 1]
        
        logger.info(f"Truncated text from {len(text)} to {len(truncated)} characters")
        return truncated
    
    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Estimate token count for text"""
        chars_per_token = 4
        return len(text) // chars_per_token
    
    @staticmethod
    def batch_items(items: List[str], max_batch_size: int = 10) -> List[List[str]]:
        """Batch items for efficient processing"""
        batches = []
        for i in range(0, len(items), max_batch_size):
            batches.append(items[i:i + max_batch_size])
        
        logger.info(f"Created {len(batches)} batches from {len(items)} items")
        return batches
    
    @staticmethod
    def compress_prompt(prompt: str) -> str:
        """Compress prompt by removing unnecessary whitespace"""
        import re
        compressed = re.sub(r'\s+', ' ', prompt)
        compressed = re.sub(r'\n\s*\n', '\n', compressed)
        return compressed.strip()


token_optimizer = TokenOptimizer()
