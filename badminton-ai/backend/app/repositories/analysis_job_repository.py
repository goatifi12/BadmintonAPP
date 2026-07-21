from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.analysis_job import AnalysisJob


class AnalysisJobRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, *, user_id: str, original_filename: str, storage_path: str, mode: str) -> AnalysisJob:
        job = AnalysisJob(user_id=user_id, original_filename=original_filename, storage_path=storage_path, mode=mode)
        self.session.add(job)
        await self.session.flush()
        return job

    async def get_by_id(self, job_id: str) -> AnalysisJob | None:
        return await self.session.get(AnalysisJob, job_id)

    async def list_for_user(self, user_id: str, limit: int = 50, offset: int = 0) -> list[AnalysisJob]:
        result = await self.session.execute(
            select(AnalysisJob)
            .where(AnalysisJob.user_id == user_id)
            .order_by(AnalysisJob.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def commit(self) -> None:
        await self.session.commit()

    async def refresh(self, job: AnalysisJob) -> None:
        await self.session.refresh(job)
