from __future__ import annotations

from typing import BinaryIO
import magic

from app.core.storage import StorageBackend
from app.db.models.analysis_job import AnalysisJob
from app.repositories.analysis_job_repository import AnalysisJobRepository

ALLOWED_VIDEO_CONTENT_PREFIX = "video/"
ALLOWED_VIDEO_MAGIC_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"}
MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024  # 2GB, matches the previous app's limit


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

        # Validate actual file content using magic bytes
        try:
            initial_bytes = stream.read(2048)
            stream.seek(0)
            mime = magic.from_buffer(initial_bytes, mime=True)
            if mime not in ALLOWED_VIDEO_MAGIC_TYPES:
                raise UnsupportedMediaTypeError(f"File type {mime} is not supported. Please upload a valid video file.")
        except Exception as e:
            raise UnsupportedMediaTypeError("Could not validate file type. Please upload a valid video file.") from e

        # Reserve the row first so the storage path can be namespaced by job id,
        # matching how the CV pipeline (Phase 3) will look artifacts up by job id.
        job = await self._jobs.create(user_id=user_id, original_filename=filename, storage_path="", mode=mode)

        bounded_stream = _SizeLimitedStream(stream, MAX_UPLOAD_BYTES)
        try:
            storage_path = self._storage.save(job_id=job.id, filename=filename, stream=bounded_stream)  # type: ignore[arg-type]
        except _UploadTooLarge as exc:
            raise UploadTooLargeError("Video file exceeds the 2GB upload limit") from exc

        job.storage_path = storage_path
        await self._jobs.commit()

        from app.workers.tasks import process_analysis_job

        process_analysis_job.delay(job.id)
        await self._jobs.refresh(job)
        return job

    async def get_owned_job(self, *, job_id: str, user_id: str) -> AnalysisJob:
        job = await self._jobs.get_by_id(job_id)
        if job is None:
            raise JobNotFoundError(f"Analysis job {job_id} not found")
        if job.user_id != user_id:
            raise JobAccessDeniedError("This analysis job belongs to another account")
        return job

    async def list_jobs(self, *, user_id: str) -> list[AnalysisJob]:
        return await self._jobs.list_for_user(user_id)


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
