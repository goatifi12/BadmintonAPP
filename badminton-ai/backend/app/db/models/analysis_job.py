from __future__ import annotations

from enum import StrEnum

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class JobStatus(StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    DONE = "done"
    ERROR = "error"


class AnalysisJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "analysis_jobs"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    mode: Mapped[str] = mapped_column(String(20), default="singles", nullable=False)

    status: Mapped[str] = mapped_column(String(20), default=JobStatus.QUEUED.value, nullable=False)
    stage: Mapped[str] = mapped_column(String(50), default="queued", nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Metrics + tactical + model-confidence payload produced by the CV pipeline.
    result_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Storage-relative paths to pipeline outputs: replay JSON, heatmap PNGs, annotated video.
    artifacts: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"AnalysisJob(id={self.id!r}, status={self.status!r}, stage={self.stage!r})"
