from __future__ import annotations

import os
from pathlib import Path
from typing import BinaryIO, Protocol

import boto3
from botocore.exceptions import ClientError

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
    """S3-backed storage implementation for production deployments."""

    def __init__(self, bucket: str, region: str | None = None) -> None:
        self.bucket = bucket
        self.region = region
        self.s3_client = boto3.client("s3", region_name=region)

    def save(self, *, job_id: str, filename: str, stream: BinaryIO) -> str:
        safe_name = Path(filename).name
        key = f"{job_id}/{safe_name}"
        try:
            self.s3_client.upload_fileobj(stream, self.bucket, key)
        except ClientError as e:
            raise RuntimeError(f"S3 upload failed: {e}") from e
        return key

    def resolve_path(self, storage_path: str) -> Path:
        # For S3, we download to a temp path for reads
        temp_dir = Path("/tmp/badminton_cache")
        temp_dir.mkdir(parents=True, exist_ok=True)
        local_path = temp_dir / storage_path.replace("/", "_")
        
        if not local_path.exists():
            try:
                self.s3_client.download_file(self.bucket, storage_path, str(local_path))
            except ClientError as e:
                raise RuntimeError(f"S3 download failed: {e}") from e
        return local_path

    def job_dir(self, job_id: str) -> Path:
        # For S3, return a local temp dir for pipeline outputs
        temp_dir = Path("/tmp/badminton_jobs")
        job_dir = temp_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        return job_dir


def get_storage_backend() -> StorageBackend:
    settings = get_settings()
    if settings.storage_backend == "s3":
        if not settings.s3_bucket:
            raise RuntimeError("STORAGE_BACKEND=s3 requires S3_BUCKET to be set")
        return S3StorageBackend(settings.s3_bucket, settings.s3_region)
    return LocalStorageBackend(settings.local_storage_dir)
