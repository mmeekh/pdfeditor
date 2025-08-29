import os
import tempfile
from typing import List

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application configuration loaded from environment with sensible defaults."""

    # File system and resource limits
    TEMP_DIR: str = Field(default_factory=lambda: os.environ.get("TEMP_DIR", os.path.join(tempfile.gettempdir(), "pdfislemleri")))
    MAX_FILE_SIZE: int = 50 * 1024 * 1024
    MAX_FILES: int = 10

    # Cleanup and session
    FILE_CLEANUP_HOURS: int = 24
    SESSION_LIFETIME_MINUTES: int = 1

    # CORS
    ALLOW_ORIGINS: List[str] = Field(default_factory=lambda: [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "https://pdfislemleri.com",
        "https://www.pdfislemleri.com",
    ])
    ALLOW_CREDENTIALS: bool = True
    ALLOW_METHODS: List[str] = Field(default_factory=lambda: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
    ALLOW_HEADERS: List[str] = Field(default_factory=lambda: ["*"])
    EXPOSE_HEADERS: List[str] = Field(default_factory=lambda: ["Content-Disposition"])


settings = Settings()

# Ensure temp dir exists at import time
os.makedirs(settings.TEMP_DIR, exist_ok=True)


