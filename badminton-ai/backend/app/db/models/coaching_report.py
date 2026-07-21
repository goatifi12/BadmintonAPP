from __future__ import annotations

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CoachingReport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "coaching_reports"

    job_id: Mapped[str] = mapped_column(ForeignKey("analysis_jobs.id", ondelete="CASCADE"), index=True, nullable=False)

    provider: Mapped[str] = mapped_column(String(30), nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(30), nullable=False)
    report_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    report_text: Mapped[str] = mapped_column(Text, nullable=False)
