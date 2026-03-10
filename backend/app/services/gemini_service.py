import google.generativeai as genai
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class GeminiService:
    _instance: Optional['GeminiService'] = None
    _model: Optional[Any] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GeminiService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._model is None:
            self._initialize_client()

    def _initialize_client(self):
        try:
            genai.configure(api_key=settings.google_api_key)
            self._model = genai.GenerativeModel(settings.gemini_model)
            logger.info(f"Gemini client initialized with model: {settings.gemini_model}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            raise

    async def generate_content(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> str:
        try:
            generation_config = {
                "temperature": temperature,
            }
            
            if max_tokens:
                generation_config["max_output_tokens"] = max_tokens
            
            response = self._model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            return response.text
        except Exception as e:
            logger.error(f"Error generating content: {e}")
            raise

    async def generate_structured_content(
        self,
        prompt: str,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        try:
            response_text = await self.generate_content(prompt, temperature)
            
            import json
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                json_text = response_text.strip()
            
            return json.loads(json_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.debug(f"Response text: {response_text}")
            raise
        except Exception as e:
            logger.error(f"Error generating structured content: {e}")
            raise


gemini_service = GeminiService()
