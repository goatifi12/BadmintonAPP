from __future__ import annotations

import os
from pathlib import Path
from typing import BinaryIO, Protocol

from app.core.config import get_settings


class StorageBackend(Protocol):
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
        self.base_dir = Path(base_dir).expanduser().resolve()
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
        path = (self.base_dir / storage_path).resolve()
        if not os.path.commonpath([self.base_dir, path]) == str(self.base_dir):
            raise RuntimeError("Storage path escapes the configured upload directory")
        return path

    def job_dir(self, job_id: str) -> Path:
        directory = self.resolve_path(job_id)
        directory.mkdir(parents=True, exist_ok=True)
        return directory


def get_storage_backend() -> StorageBackend:
    settings = get_settings()
    return LocalStorageBackend(settings.local_storage_dir)
