from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AnalysisJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_filename: str
    mode: str
    status: str
    stage: str
    progress: int
    error: str | None
    result_summary: dict[str, Any] | None
    artifacts: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
