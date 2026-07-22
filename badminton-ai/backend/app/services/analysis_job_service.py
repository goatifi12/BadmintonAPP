from __future__ import annotations

import asyncio
from pathlib import Path
from typing import BinaryIO

from app.core.config import get_settings
from app.core.storage import StorageBackend
from app.db.models.analysis_job import AnalysisJob
from app.repositories.analysis_job_repository import AnalysisJobRepository

ALLOWED_VIDEO_CONTENT_PREFIX = "video/"
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


class AnalysisJobError(Exception):
    pass


class UnsupportedMediaTypeError(AnalysisJobError):
    pass


class UploadTooLargeError(AnalysisJobError):
    pass


class JobNotFoundError(AnalysisJobError):
    pass


class JobAccessDeniedError(AnalysisJobError):
    pass


class AnalysisJobService:
    def __init__(self, repository: AnalysisJobRepository, storage: StorageBackend) -> None:
        self._jobs = repository
        self._storage = storage

    async def create_job(
        self,
        *,
        user_id: str,
        filename: str,
        content_type: str | None,
        stream: BinaryIO,
        mode: str = "singles",
    ) -> AnalysisJob:
        if not content_type or not content_type.startswith(ALLOWED_VIDEO_CONTENT_PREFIX):
            raise UnsupportedMediaTypeError("Upload a video file.")

        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED_VIDEO_EXTENSIONS:
            raise UnsupportedMediaTypeError("Supported video formats are MP4, MOV, AVI, MKV, and WEBM.")

        # Reserve the row first so the storage path can be namespaced by job id,
        # matching how the CV pipeline (Phase 3) will look artifacts up by job id.
        job = await self._jobs.create(user_id=user_id, original_filename=filename, storage_path="", mode=mode)

        settings = get_settings()
        bounded_stream = _SizeLimitedStream(stream, settings.max_upload_bytes)
        try:
            storage_path = self._storage.save(job_id=job.id, filename=filename, stream=bounded_stream)  # type: ignore[arg-type]
        except _UploadTooLarge as exc:
            max_mb = settings.max_upload_bytes // (1024 * 1024)
            raise UploadTooLargeError(f"Video file exceeds the {max_mb}MB upload limit") from exc

        job.storage_path = storage_path
        await self._jobs.commit()

        if settings.process_jobs_inline:
            from app.workers.tasks import process_analysis_job

            await asyncio.to_thread(process_analysis_job, job.id)
        await self._jobs.refresh(job)
        return job

    async def get_owned_job(self, *, job_id: str, user_id: str) -> AnalysisJob:
        job = await self._jobs.get_by_id(job_id)
        if job is None:
            raise JobNotFoundError(f"Analysis job {job_id} not found")
        if job.user_id != user_id:
            raise JobAccessDeniedError("This analysis job belongs to another account")
        return job

    async def list_jobs(self, *, user_id: str, limit: int = 50, offset: int = 0) -> list[AnalysisJob]:
        return await self._jobs.list_for_user(user_id, limit=limit, offset=offset)


class _UploadTooLarge(Exception):
    pass


class _SizeLimitedStream:
    """Wraps a file-like object and raises once more than `limit` bytes are read,
    so a single oversized upload can't be streamed unbounded to disk.
    """

    def __init__(self, inner: BinaryIO, limit: int) -> None:
        self._inner = inner
        self._limit = limit
        self._read = 0

    def read(self, size: int = -1) -> bytes:
        chunk = self._inner.read(size)
        self._read += len(chunk)
        if self._read > self._limit:
            raise _UploadTooLarge()
        return chunk
