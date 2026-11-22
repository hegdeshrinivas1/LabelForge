from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration settings loaded from environment variables and .env file.
    """
    ENVIRONMENT: str = "development"
    APP_NAME: str = "LabelForge"
    DEBUG: bool = True

    # Database: SQLite for local development, PostgreSQL for production
    DATABASE_URL: str = "sqlite:///./labelforge.db"

    # Security & JWT Token
    SECRET_KEY: str = "labelforge_insecure_development_secret_key_change_in_production_12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS configuration
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated origins from FRONTEND_URL or return single string."""
        if not self.FRONTEND_URL:
            return ["http://localhost:5173"]
        return [url.strip() for url in self.FRONTEND_URL.split(",") if url.strip()]


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
