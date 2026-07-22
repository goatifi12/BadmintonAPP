from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    app_name: str = "Badminton AI"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    auto_create_tables: bool = True

    # --- Database ---
    # SQLite keeps the PythonAnywhere Free deployment independent from
    # paid/card-backed database providers.
    database_url: str = "sqlite+aiosqlite:///./badminton_dev.db"

    # --- Auth ---
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24h
    refresh_token_expire_minutes: int = 60 * 24 * 14  # 14d

    # --- Storage ---
    local_storage_dir: str = "./data/uploads"

    # --- Jobs ---
    process_jobs_inline: bool = True
    max_upload_bytes: int = 100 * 1024 * 1024

    # --- Coaching LLM (OpenRouter - free-tier friendly, OpenAI-compatible REST API) ---
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    # "openrouter/free" auto-selects from whatever free models are currently
    # available, which matters because specific `:free` model IDs are
    # deprecated/rotated frequently. Pin a specific model (e.g.
    # "meta-llama/llama-3.3-70b-instruct:free") here if you want a fixed
    # model instead of the auto-router.
    openrouter_model: str = "openrouter/free"
    openrouter_site_url: str = "https://badminton-ai.local"
    openrouter_app_name: str = "Badminton AI"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                return value
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
