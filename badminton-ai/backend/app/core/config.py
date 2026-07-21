from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    app_name: str = "Badminton AI"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # --- Database ---
    # Async URL used by the app (asyncpg). Example:
    # postgresql+asyncpg://badminton:badminton@localhost:5432/badminton
    database_url: str = "sqlite+aiosqlite:///./badminton_dev.db"

    # --- Auth ---
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24h
    refresh_token_expire_minutes: int = 60 * 24 * 14  # 14d

    # --- Storage ---
    storage_backend: str = "local"  # "local" | "s3"
    local_storage_dir: str = "./data/uploads"
    s3_bucket: str | None = None
    s3_region: str | None = None

    # --- Jobs ---
    redis_url: str = "redis://localhost:6379/0"
    celery_task_always_eager: bool = True  # runs tasks inline until a worker/broker is wired up

    # --- Third-party CV providers ---
    roboflow_api_key: str | None = None
    roboflow_api_url: str = "https://serverless.roboflow.com"

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
