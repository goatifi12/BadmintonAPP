from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.player_track import PlayerTrack


class PlayerTrackRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_job(self, job_id: str, player_id: int | None = None) -> list[PlayerTrack]:
        query = select(PlayerTrack).where(PlayerTrack.job_id == job_id)
        if player_id is not None:
            query = query.where(PlayerTrack.player_id == player_id)
        result = await self.session.execute(query.order_by(PlayerTrack.frame))
        return list(result.scalars().all())
