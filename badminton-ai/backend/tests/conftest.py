from __future__ import annotations

from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker

import app.db.session_sync as session_sync_module
import app.workers.tasks as tasks_module
from app.api.deps import get_storage
from app.core.storage import LocalStorageBackend
from app.db.base import Base
from app.db.session import get_db_session
from app.main import create_app


@pytest_asyncio.fixture
async def db_session(tmp_path: Path) -> AsyncGenerator[AsyncSession, None]:
    # Use an on-disk (not :memory:) SQLite file so the Celery task's *sync*
    # session — patched below to point at the same file — reads/writes the
    # same data as this async session. Celery's eager mode runs the task
    # in-process during the test, which is what makes this necessary.
    db_path = tmp_path / "test.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Point the worker's sync engine at the same file for the duration of the test.
    original_engine = session_sync_module.sync_engine
    original_session_local = session_sync_module.SyncSessionLocal
    sync_engine = create_engine(f"sqlite:///{db_path}", future=True)
    session_sync_module.sync_engine = sync_engine
    session_sync_module.SyncSessionLocal = sessionmaker(bind=sync_engine, expire_on_commit=False, class_=session_sync_module.Session)

    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    session_sync_module.sync_engine = original_engine
    session_sync_module.SyncSessionLocal = original_session_local
    sync_engine.dispose()
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession, tmp_path: Path) -> AsyncGenerator[AsyncClient, None]:
    app = create_app()

    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    def override_get_storage() -> LocalStorageBackend:
        return LocalStorageBackend(str(tmp_path / "uploads"))

    app.dependency_overrides[get_db_session] = override_get_db_session
    app.dependency_overrides[get_storage] = override_get_storage

    # The Celery task runs outside FastAPI's dependency injection (it's a
    # plain sync function invoked by the worker), so it resolves storage via
    # the module-level `get_storage_backend` rather than the `get_storage`
    # dependency above. Patch that reference too so pipeline outputs land in
    # the same tmp directory the API reads them back from.
    original_get_storage_backend = tasks_module.get_storage_backend
    tasks_module.get_storage_backend = override_get_storage

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    tasks_module.get_storage_backend = original_get_storage_backend


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"
