from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class ShotEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    frame: int
    timestamp: float
    player_id: int | None
    shot_type: str
    confidence: float
    speed_km_h: float
    angle_deg: float
    landing_x: float | None
    landing_y: float | None
    quality_score: int | None
    quality_grade: str | None


class PlayerTrackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    frame: int
    player_id: int
    team: str
    x: float
    y: float
    speed_ms: float
    confidence: float


class CoachingReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    provider: str
    model: str
    prompt_version: str
    report_json: dict[str, Any]
    report_text: str
