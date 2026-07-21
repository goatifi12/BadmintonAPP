from __future__ import annotations

from pathlib import Path
from typing import BinaryIO, Protocol

from app.core.config import get_settings


class StorageBackend(Protocol):
    """Storage contract every backend must satisfy. Swapping `local` for `s3`
    later means implementing this Protocol — nothing above this layer changes.
    """

    def save(self, *, job_id: str, filename: str, stream: BinaryIO) -> str:
        """Persist a file stream and return a backend-relative path/key."""
        ...

    def resolve_path(self, storage_path: str) -> Path:
        """Resolve a stored path/key back to a local filesystem Path for reads."""
        ...

    def job_dir(self, job_id: str) -> Path:
        """Return a local, writable directory scoped to this job for pipeline
        outputs (replay JSON, heatmaps, annotated video).
        """
        ...


class LocalStorageBackend:
    def __init__(self, base_dir: str) -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save(self, *, job_id: str, filename: str, stream: BinaryIO) -> str:
        job_dir = self.base_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        safe_name = Path(filename).name  # strip any path components from the client
        destination = job_dir / safe_name
        with destination.open("wb") as out:
            while chunk := stream.read(1024 * 1024):
                out.write(chunk)
        return f"{job_id}/{safe_name}"

    def resolve_path(self, storage_path: str) -> Path:
        return self.base_dir / storage_path

    def job_dir(self, job_id: str) -> Path:
        directory = self.base_dir / job_id
        directory.mkdir(parents=True, exist_ok=True)
        return directory


class S3StorageBackend:
    """Placeholder for the S3-backed implementation. Not wired up yet —
    exists so `get_storage_backend()` has a real second branch to grow into.
    """

    def __init__(self, bucket: str, region: str | None) -> None:
        self.bucket = bucket
        self.region = region

    def save(self, *, job_id: str, filename: str, stream: BinaryIO) -> str:
        raise NotImplementedError("S3 storage backend is not implemented yet")

    def resolve_path(self, storage_path: str) -> Path:
        raise NotImplementedError("S3 storage backend is not implemented yet")

    def job_dir(self, job_id: str) -> Path:
        raise NotImplementedError("S3 storage backend is not implemented yet")


def get_storage_backend() -> StorageBackend:
    settings = get_settings()
    if settings.storage_backend == "s3":
        if not settings.s3_bucket:
            raise RuntimeError("STORAGE_BACKEND=s3 requires S3_BUCKET to be set")
        return S3StorageBackend(settings.s3_bucket, settings.s3_region)
    return LocalStorageBackend(settings.local_storage_dir)
