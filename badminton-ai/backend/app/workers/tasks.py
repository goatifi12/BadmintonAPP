from __future__ import annotations

from typing import Any

from app.core.storage import get_storage_backend
from app.db.models.analysis_job import AnalysisJob, JobStatus
from app.db.models.coaching_report import CoachingReport
from app.db.models.player_track import PlayerTrack
from app.db.models.shot_event import ShotEvent
from app.db.session_sync import sync_session_scope
from app.pipeline.orchestrator import CVPipeline, PipelineConfig
from app.services.coaching_engine import CoachingEngine
from app.workers.celery_app import celery_app

# Stage -> progress floor. "tracking" spans a wide range because it is the
# most expensive stage (one pass over every frame); its callback interpolates
# within [floor, next floor) using the frame index so the frontend progress
# bar moves smoothly instead of jumping once per stage.
PROGRESS_FLOORS: dict[str, int] = {
    "rally_segmentation": 8,
    "court_calibration": 15,
    "tracking": 20,
    "shot_detection": 65,
    "analytics": 78,
    "coaching": 85,
    "rendering": 90,
    "saving": 98,
    "done": 100,
}
_STAGE_ORDER = list(PROGRESS_FLOORS)


@celery_app.task(name="analysis.process_job", bind=True)
def process_analysis_job(self, job_id: str) -> dict[str, Any]:
    with sync_session_scope() as session:
        job = session.get(AnalysisJob, job_id)
        if job is None:
            return {"error": f"job {job_id} not found"}

        storage = get_storage_backend()
        video_path = storage.resolve_path(job.storage_path)
        output_dir = storage.job_dir(job.id)

        def on_progress(stage: str, frame_no: int) -> None:
            job.status = JobStatus.PROCESSING.value
            job.stage = stage
            job.progress = _progress_for(stage, frame_no)
            session.flush()

        try:
            pipeline = CVPipeline(PipelineConfig(output_dir=output_dir))
            result = pipeline.run(job.id, video_path, job.mode, progress=on_progress)

            session.query(ShotEvent).filter(ShotEvent.job_id == job.id).delete()
            session.query(PlayerTrack).filter(PlayerTrack.job_id == job.id).delete()
            session.add_all(_shot_event_rows(job.id, result.shot_events, result.shot_qualities))
            session.add_all(_player_track_rows(job.id, result.player_tracks))
            session.flush()

            job.stage = "coaching"
            job.progress = PROGRESS_FLOORS["coaching"]
            session.flush()
            coaching = CoachingEngine().generate(result.metrics, result.tactical, result.model)
            session.add(
                CoachingReport(
                    job_id=job.id,
                    provider=coaching["provider"],
                    model=coaching["model"],
                    prompt_version=coaching["prompt_version"],
                    report_json=coaching["report_json"],
                    report_text=coaching["report_text"],
                )
            )
            recommendations = coaching["report_json"].get("training_recommendations") or []
            tactical = dict(result.tactical)
            if recommendations:
                tactical["coaching_tips"] = list(dict.fromkeys([*recommendations, *tactical.get("coaching_tips", [])]))[:8]

            insights = _insights(result.metrics, result.model)
            insights["coaching_provider"] = coaching["provider"]
            insights["coaching_summary"] = coaching["report_json"].get("summary", "")

            job.result_summary = {**result.metrics, "tactical": tactical, "model": result.model, "insights": insights}
            job.artifacts = {
                "replay": f"{job.id}/{result.artifacts.replay_path.name}",
                "annotated_video": f"{job.id}/{result.artifacts.annotated_video_path.name}",
                "heatmaps": {name: f"{job.id}/{path.name}" for name, path in result.artifacts.heatmap_paths.items()},
            }
            job.stage = "done"
            job.progress = 100
            job.status = JobStatus.DONE.value
            session.flush()
            return job.result_summary
        except Exception as exc:
            job.status = JobStatus.ERROR.value
            job.error = str(exc)
            session.flush()
            raise


def _shot_event_rows(job_id: str, shot_events: list[dict[str, Any]], shot_qualities: list[dict[str, Any]]) -> list[ShotEvent]:
    quality_by_frame = {q.get("frame"): q for q in shot_qualities}
    rows = []
    for shot in shot_events:
        landing = shot.get("landing_m") or [None, None]
        quality = quality_by_frame.get(shot.get("frame"), {})
        rows.append(
            ShotEvent(
                job_id=job_id,
                frame=int(shot.get("frame", 0)),
                timestamp=float(shot.get("timestamp", 0)),
                player_id=shot.get("player_id"),
                shot_type=shot.get("shot_type") or shot.get("stroke_type", "unknown"),
                confidence=float(shot.get("confidence", 0)),
                speed_km_h=float(shot.get("speed", 0)),
                angle_deg=float(shot.get("v_angle", 0)),
                landing_x=landing[0],
                landing_y=landing[1],
                quality_score=quality.get("score"),
                quality_grade=quality.get("grade"),
            )
        )
    return rows


def _player_track_rows(job_id: str, player_tracks: list[dict[str, Any]]) -> list[PlayerTrack]:
    return [
        PlayerTrack(
            job_id=job_id,
            frame=int(track["frame"]),
            player_id=int(track["player_id"]),
            team=str(track.get("team", "0")),
            x=float(track["x"]),
            y=float(track["y"]),
            speed_ms=float(track.get("speed", 0)),
            confidence=float(track.get("confidence", 0)),
        )
        for track in player_tracks
    ]


def _progress_for(stage: str, frame_no: int) -> int:
    if stage not in PROGRESS_FLOORS:
        return 5
    floor = PROGRESS_FLOORS[stage]
    if stage != "tracking":
        return floor
    next_index = _STAGE_ORDER.index(stage) + 1
    ceiling = PROGRESS_FLOORS[_STAGE_ORDER[next_index]] if next_index < len(_STAGE_ORDER) else 100
    # frame_no isn't bounded here (the callback doesn't know total_frames), so
    # nudge progress up gradually rather than guessing a fraction that could
    # overshoot the ceiling.
    return min(ceiling - 1, floor + min(frame_no // 10, ceiling - floor - 1))


def _insights(metrics: dict[str, Any], model_info: dict[str, Any]) -> dict[str, Any]:
    avg = metrics.get("avg_shuttle_speed_km_h", 0)
    confidence = model_info.get("analysis_confidence", "medium")
    return {
        "overall_rating": "needs_clearer_video" if confidence == "low" else "advanced" if avg > 200 else "intermediate" if avg > 100 else "beginner",
        "consistency_level": "good" if metrics.get("speed_variance", 0) < 2000 else "variable",
        "power_analysis": "high_power" if metrics.get("max_shuttle_speed_km_h", 0) > 220 else "moderate_power",
        "analysis_confidence": confidence,
    }
