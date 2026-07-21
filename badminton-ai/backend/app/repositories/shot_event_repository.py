from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.shot_event import ShotEvent


class ShotEventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_job(self, job_id: str) -> list[ShotEvent]:
        result = await self.session.execute(select(ShotEvent).where(ShotEvent.job_id == job_id).order_by(ShotEvent.frame))
        return list(result.scalars().all())
