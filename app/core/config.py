import os
import tempfile
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application configuration loaded from environment with sensible defaults."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # File system and resource limits
    TEMP_DIR: str = Field(default_factory=lambda: os.environ.get("TEMP_DIR", os.path.join(tempfile.gettempdir(), "pdfislemleri")))
    MAX_FILE_SIZE: int = 100 * 1024 * 1024
    MAX_FILES: int = 20

    # Cleanup and session
    # KVKK data-minimization: kısa retention. Site genelinde "15 dakika" sözü
    # veriliyor; bu hard ceiling de 24h -> 1h'ye çekildi.
    FILE_CLEANUP_HOURS: int = 1
    SESSION_LIFETIME_MINUTES: int = 5
    
    # Security
    # SECRET_KEY must be provided via environment (no default). Pydantic will raise
    # a ValidationError at startup if the SECRET_KEY env var / .env entry is missing.
    SECRET_KEY: str
    DEBUG: bool = False

    # CORS
    ALLOW_ORIGINS: List[str] = Field(default_factory=lambda: [
        "https://pdfislemleri.com",
        "https://www.pdfislemleri.com",
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://localhost:8000",
    ])
    
    # Additional security settings
    SECURE_SSL_REDIRECT: bool = True
    SECURE_HSTS_SECONDS: int = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS: bool = True
    SECURE_HSTS_PRELOAD: bool = True
    SECURE_CONTENT_TYPE_NOSNIFF: bool = True
    SECURE_BROWSER_XSS_FILTER: bool = True
    ALLOW_CREDENTIALS: bool = True
    ALLOW_METHODS: List[str] = Field(default_factory=lambda: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
    ALLOW_HEADERS: List[str] = Field(default_factory=lambda: [
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "Cache-Control",
        "Pragma"
    ])
    EXPOSE_HEADERS: List[str] = Field(default_factory=lambda: [
        "Content-Disposition",
        "Content-Type",
        "Content-Length",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Credentials"
    ])


settings = Settings()

# Ensure temp dir exists at import time
os.makedirs(settings.TEMP_DIR, exist_ok=True)


