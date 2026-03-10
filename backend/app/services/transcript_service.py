from typing import Optional, List
from app.services.gemini_service import gemini_service
from app.core.logging import get_logger

logger = get_logger(__name__)


class TranscriptService:
    """Generate transcripts from audio using Gemini"""
    
    @staticmethod
    async def transcribe_audio(audio_data: bytes, language: str = "en") -> str:
        """Transcribe audio using Gemini API"""
        try:
            prompt = f"""
You are an expert transcription service.
Transcribe the following audio accurately.
Language: {language}

Provide the transcription in plain text format.
"""
            
            logger.info("Sending audio to Gemini for transcription")
            transcript = await gemini_service.generate_content(prompt)
            
            logger.info(f"Generated transcript ({len(transcript)} characters)")
            return transcript
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            raise
    
    @staticmethod
    async def transcribe_audio_chunks(audio_chunks: List[bytes]) -> str:
        """Transcribe multiple audio chunks"""
        transcripts = []
        
        for i, chunk in enumerate(audio_chunks):
            try:
                logger.info(f"Transcribing chunk {i+1}/{len(audio_chunks)}")
                transcript = await TranscriptService.transcribe_audio(chunk)
                transcripts.append(transcript)
            except Exception as e:
                logger.error(f"Error transcribing chunk {i}: {e}")
                transcripts.append(f"[Transcription error for chunk {i}]")
        
        return " ".join(transcripts)
    
    @staticmethod
    def clean_transcript(transcript: str) -> str:
        """Clean and format transcript"""
        import re
        
        transcript = re.sub(r'\s+', ' ', transcript)
        transcript = re.sub(r'\[.*?\]', '', transcript)
        transcript = transcript.strip()
        
        return transcript


transcript_service = TranscriptService()
