import io
import base64
from typing import Optional, List
from app.core.logging import get_logger

logger = get_logger(__name__)


class AudioProcessor:
    """Process audio input"""
    
    SUPPORTED_FORMATS = ['wav', 'mp3', 'ogg', 'webm', 'flac']
    MAX_CHUNK_SIZE = 1024 * 1024 * 5  # 5MB chunks
    
    @staticmethod
    def validate_audio_format(filename: str) -> bool:
        """Validate audio file format"""
        extension = filename.split('.')[-1].lower()
        return extension in AudioProcessor.SUPPORTED_FORMATS
    
    @staticmethod
    async def chunk_audio(audio_data: bytes, chunk_size: int = MAX_CHUNK_SIZE) -> List[bytes]:
        """Split audio into chunks for streaming"""
        chunks = []
        offset = 0
        
        while offset < len(audio_data):
            chunk = audio_data[offset:offset + chunk_size]
            chunks.append(chunk)
            offset += chunk_size
        
        logger.info(f"Split audio into {len(chunks)} chunks")
        return chunks
    
    @staticmethod
    def encode_audio_base64(audio_data: bytes) -> str:
        """Encode audio data to base64"""
        return base64.b64encode(audio_data).decode('utf-8')
    
    @staticmethod
    def decode_audio_base64(encoded_data: str) -> bytes:
        """Decode base64 audio data"""
        return base64.b64decode(encoded_data)


audio_processor = AudioProcessor()
