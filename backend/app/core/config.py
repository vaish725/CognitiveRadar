from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )

    # Environment
    environment: str = "development"

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_reload: bool = True
    api_version: str = "v1"

    # CORS Configuration
    allowed_origins: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    # Google Cloud Configuration
    google_api_key: str
    google_project_id: str = ""

    # Firestore Configuration
    firestore_emulator_host: str = ""

    # Security
    secret_key: str
    access_token_expire_minutes: int = 30

    # Logging
    log_level: str = "INFO"

    # Gemini Configuration
    gemini_model: str = "gemini-2.0-flash-exp"
    gemini_max_retries: int = 3
    gemini_timeout: int = 60

    # WebSocket Configuration
    ws_heartbeat_interval: int = 30
    ws_message_queue_size: int = 100


settings = Settings()
