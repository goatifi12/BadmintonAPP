from __future__ import annotations

import asyncio

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.deps import AnalysisJobServiceDep, CoachingReportRepositoryDep, CurrentUser, PlayerTrackRepositoryDep, ShotEventRepositoryDep, StorageDep
from app.schemas.analysis_job import AnalysisJobRead
from app.schemas.analytics import CoachingReportRead, PlayerTrackRead, ShotEventRead
from app.services.analysis_job_service import JobAccessDeniedError, JobNotFoundError, UnsupportedMediaTypeError, UploadTooLargeError
from app.services.coaching_engine import CoachingEngine

router = APIRouter(prefix="/jobs", tags=["jobs"])
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=AnalysisJobRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def create_job(
    current_user: CurrentUser,
    job_service: AnalysisJobServiceDep,
    video: UploadFile = File(...),
    mode: str = Form("singles"),
) -> AnalysisJobRead:
    if not video.filename:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Missing video file")
    try:
        job = await job_service.create_job(
            user_id=current_user.id,
            filename=video.filename,
            content_type=video.content_type,
            stream=video.file,
            mode=mode,
        )
    except UnsupportedMediaTypeError as exc:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(exc)) from exc
    except UploadTooLargeError as exc:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc)) from exc
    return AnalysisJobRead.model_validate(job)


@router.get("", response_model=list[AnalysisJobRead])
async def list_jobs(
    current_user: CurrentUser,
    job_service: AnalysisJobServiceDep,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[AnalysisJobRead]:
    jobs = await job_service.list_jobs(user_id=current_user.id, limit=limit, offset=offset)
    return [AnalysisJobRead.model_validate(job) for job in jobs]


@router.get("/{job_id}", response_model=AnalysisJobRead)
async def get_job(job_id: str, current_user: CurrentUser, job_service: AnalysisJobServiceDep) -> AnalysisJobRead:
    try:
        job = await job_service.get_owned_job(job_id=job_id, user_id=current_user.id)
    except JobNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except JobAccessDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    return AnalysisJobRead.model_validate(job)


async def _owned_job_artifacts(job_id: str, current_user: CurrentUser, job_service: AnalysisJobServiceDep) -> dict:
    try:
        job = await job_service.get_owned_job(job_id=job_id, user_id=current_user.id)
    except JobNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except JobAccessDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if job.status != "done" or not job.artifacts:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Analysis is not finished yet")
    return job.artifacts


@router.get("/{job_id}/replay")
async def get_job_replay(job_id: str, current_user: CurrentUser, job_service: AnalysisJobServiceDep, storage: StorageDep) -> FileResponse:
    artifacts = await _owned_job_artifacts(job_id, current_user, job_service)
    path = storage.resolve_path(artifacts["replay"])
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Replay file not found")
    return FileResponse(path, media_type="application/json")


@router.get("/{job_id}/video")
async def get_job_annotated_video(job_id: str, current_user: CurrentUser, job_service: AnalysisJobServiceDep, storage: StorageDep) -> FileResponse:
    artifacts = await _owned_job_artifacts(job_id, current_user, job_service)
    path = storage.resolve_path(artifacts["annotated_video"])
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Annotated video not found")
    return FileResponse(path, media_type="video/mp4")


@router.get("/{job_id}/heatmaps/{name}")
async def get_job_heatmap(job_id: str, name: str, current_user: CurrentUser, job_service: AnalysisJobServiceDep, storage: StorageDep) -> FileResponse:
    artifacts = await _owned_job_artifacts(job_id, current_user, job_service)
    heatmaps = artifacts.get("heatmaps", {})
    if name not in heatmaps:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No heatmap named '{name}' for this job")
    path = storage.resolve_path(heatmaps[name])
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Heatmap file not found")
    return FileResponse(path, media_type="image/png")


async def _owned_job(job_id: str, current_user: CurrentUser, job_service: AnalysisJobServiceDep):
    try:
        return await job_service.get_owned_job(job_id=job_id, user_id=current_user.id)
    except JobNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except JobAccessDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get("/{job_id}/shots", response_model=list[ShotEventRead])
async def get_job_shots(job_id: str, current_user: CurrentUser, job_service: AnalysisJobServiceDep, repo: ShotEventRepositoryDep) -> list[ShotEventRead]:
    await _owned_job(job_id, current_user, job_service)
    shots = await repo.list_for_job(job_id)
    return [ShotEventRead.model_validate(s) for s in shots]


@router.get("/{job_id}/player-tracks", response_model=list[PlayerTrackRead])
async def get_job_player_tracks(
    job_id: str,
    current_user: CurrentUser,
    job_service: AnalysisJobServiceDep,
    repo: PlayerTrackRepositoryDep,
    player_id: int | None = Query(None, description="Filter to a single player id"),
) -> list[PlayerTrackRead]:
    await _owned_job(job_id, current_user, job_service)
    tracks = await repo.list_for_job(job_id, player_id=player_id)
    return [PlayerTrackRead.model_validate(t) for t in tracks]


@router.post("/{job_id}/coaching", response_model=CoachingReportRead)
async def regenerate_coaching(
    job_id: str,
    current_user: CurrentUser,
    job_service: AnalysisJobServiceDep,
    coaching_repo: CoachingReportRepositoryDep,
    force: bool = Query(False, description="Skip the cache and call the LLM again"),
) -> CoachingReportRead:
    job = await _owned_job(job_id, current_user, job_service)
    if job.status != "done" or not job.result_summary:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Analysis is not finished yet")

    if not force:
        cached = await coaching_repo.get_latest_for_job(job_id)
        if cached is not None and cached.provider == "openrouter":
            return CoachingReportRead.model_validate(cached)

    metrics = {k: v for k, v in job.result_summary.items() if k not in ("tactical", "model", "insights")}
    tactical = job.result_summary.get("tactical", {})
    model_info = job.result_summary.get("model", {})

    # httpx.post is a blocking call; run it off the event loop so one slow
    # LLM call doesn't stall every other request this process is handling.
    coaching = await asyncio.to_thread(CoachingEngine().generate, metrics, tactical, model_info)
    report = await coaching_repo.create(
        job_id=job_id,
        provider=coaching["provider"],
        model=coaching["model"],
        prompt_version=coaching["prompt_version"],
        report_json=coaching["report_json"],
        report_text=coaching["report_text"],
    )
    await coaching_repo.commit()
    return CoachingReportRead.model_validate(report)
