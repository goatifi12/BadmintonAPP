from __future__ import annotations

from contextlib import contextmanager
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


def _to_sync_url(async_url: str) -> str:
    """Celery workers are plain sync processes, so they use the sync driver
    variant of the same DATABASE_URL instead of the asyncio one FastAPI uses.
    """
    return async_url.replace("+asyncpg", "").replace("+aiosqlite", "")


settings = get_settings()
sync_engine = create_engine(_to_sync_url(settings.database_url), future=True)
SyncSessionLocal = sessionmaker(bind=sync_engine, expire_on_commit=False, class_=Session)


@contextmanager
def sync_session_scope() -> Iterator[Session]:
    session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
