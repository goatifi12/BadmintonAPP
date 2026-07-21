from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.storage import StorageBackend, get_storage_backend
from app.db.models.user import User
from app.db.session import get_db_session
from app.repositories.analysis_job_repository import AnalysisJobRepository
from app.repositories.coaching_report_repository import CoachingReportRepository
from app.repositories.player_track_repository import PlayerTrackRepository
from app.repositories.shot_event_repository import ShotEventRepository
from app.repositories.user_repository import UserRepository
from app.services.analysis_job_service import AnalysisJobService
from app.services.auth_service import AuthService, InvalidCredentialsError

_bearer_scheme = HTTPBearer(auto_error=True)

DbSession = Annotated[AsyncSession, Depends(get_db_session)]


def get_auth_service(session: DbSession) -> AuthService:
    return AuthService(UserRepository(session))


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
    auth_service: AuthServiceDep,
) -> User:
    try:
        return await auth_service.get_current_user(access_token=credentials.credentials)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc), headers={"WWW-Authenticate": "Bearer"}) from exc


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_storage() -> StorageBackend:
    return get_storage_backend()


StorageDep = Annotated[StorageBackend, Depends(get_storage)]


def get_analysis_job_service(session: DbSession, storage: StorageDep) -> AnalysisJobService:
    return AnalysisJobService(AnalysisJobRepository(session), storage)


AnalysisJobServiceDep = Annotated[AnalysisJobService, Depends(get_analysis_job_service)]


def get_shot_event_repository(session: DbSession) -> ShotEventRepository:
    return ShotEventRepository(session)


ShotEventRepositoryDep = Annotated[ShotEventRepository, Depends(get_shot_event_repository)]


def get_player_track_repository(session: DbSession) -> PlayerTrackRepository:
    return PlayerTrackRepository(session)


PlayerTrackRepositoryDep = Annotated[PlayerTrackRepository, Depends(get_player_track_repository)]


def get_coaching_report_repository(session: DbSession) -> CoachingReportRepository:
    return CoachingReportRepository(session)


CoachingReportRepositoryDep = Annotated[CoachingReportRepository, Depends(get_coaching_report_repository)]
