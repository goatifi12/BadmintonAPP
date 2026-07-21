from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ShotEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "shot_events"

    job_id: Mapped[str] = mapped_column(ForeignKey("analysis_jobs.id", ondelete="CASCADE"), index=True, nullable=False)

    frame: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[float] = mapped_column(Float, nullable=False)
    player_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    shot_type: Mapped[str] = mapped_column(String(30), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    speed_km_h: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    angle_deg: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    landing_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    landing_y: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quality_grade: Mapped[str | None] = mapped_column(String(20), nullable=True)
