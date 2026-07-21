from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.coaching_report import CoachingReport


class CoachingReportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_latest_for_job(self, job_id: str) -> CoachingReport | None:
        result = await self.session.execute(
            select(CoachingReport).where(CoachingReport.job_id == job_id).order_by(CoachingReport.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def create(self, *, job_id: str, provider: str, model: str, prompt_version: str, report_json: dict, report_text: str) -> CoachingReport:
        report = CoachingReport(job_id=job_id, provider=provider, model=model, prompt_version=prompt_version, report_json=report_json, report_text=report_text)
        self.session.add(report)
        await self.session.flush()
        return report

    async def commit(self) -> None:
        await self.session.commit()
