import uuid
import time


def generate_id() -> str:
    """Generate a unique ID"""
    return str(uuid.uuid4())


def get_timestamp() -> int:
    """Get current timestamp in milliseconds"""
    return int(time.time() * 1000)


def validate_confidence(confidence: float) -> bool:
    """Validate confidence score is between 0 and 1"""
    return 0.0 <= confidence <= 1.0
