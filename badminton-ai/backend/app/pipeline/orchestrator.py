from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from app.pipeline.analytics import AnalyticsEngine
from app.pipeline.court import CourtCalibrationStage
from app.pipeline.free_cv_tracker import FreeBadmintonModel
from app.pipeline.kalman import smooth_points
from app.pipeline.models import PipelineArtifacts, PipelineResult, ProgressCallback, StageEvidence
from app.pipeline.rally_segmenter import RallySegmenter
from app.pipeline.replay_exporter import export_replay
from app.pipeline.shots import TemporalShotClassifier
from app.pipeline.video_io import inspect_video


@dataclass
class PipelineConfig:
    output_dir: Path


class CVPipeline:
    """End-to-end local computer-vision pipeline: rally segmentation -> court
    calibration -> player/shuttle tracking -> shot classification -> analytics
    -> rendering. Each stage reports a `StageEvidence` so the aggregate
    confidence and warnings surfaced to the frontend are grounded in what was
    actually detected, not just "it ran without crashing".

    Tracking uses `FreeBadmintonModel` (pure OpenCV, no GPU or external API).
    A hosted or GPU-based tracker can be swapped in later by implementing the
    same `analyze_video(...) -> (shuttle_points, player_frames, report)`
    contract in `_run_tracking` — nothing else in this class would need to change.
    """

    def __init__(self, config: PipelineConfig) -> None:
        self.config = config
        self.court_stage = CourtCalibrationStage()
        self.classifier = TemporalShotClassifier()
        self.analytics = AnalyticsEngine(config.output_dir)
        self.rally_segmenter = RallySegmenter(config.output_dir)

    def run(self, job_id: str, upload_path: Path, mode: str, progress: ProgressCallback | None = None) -> PipelineResult:
        source_metadata, _ = inspect_video(upload_path)
        max_players = 4 if mode == "doubles" else 2
        self._progress(progress, "rally_segmentation", 0)

        segment_path, metadata, first_frame, rally_evidence = self.rally_segmenter.segment(job_id, upload_path, source_metadata)

        self._progress(progress, "court_calibration", 0)
        court, court_evidence = self.court_stage.run(first_frame)

        self._progress(progress, "tracking", 0)
        tracker = FreeBadmintonModel()
        points, player_frames, tracker_report = tracker.analyze_video(
            segment_path, metadata.processed_frames, metadata.frame_w, metadata.frame_h, court=court, max_players=max_players, progress=progress
        )
        points = smooth_points(points)
        player_frames = self._patch_player_court_coords(player_frames, court)

        tracker_evidence = [
            StageEvidence(
                name="shuttle",
                method="OpenCV motion + color heuristics with Kalman smoothing",
                confidence=tracker_report.shuttle_track_coverage_rate,
                warnings=[] if tracker_report.shuttle_track_coverage_rate >= 0.25 else ["Shuttle track coverage is low; shot timing and speed may be approximate."],
                details={
                    "raw_detection_rate": tracker_report.shuttle_detection_rate,
                    "track_coverage_rate": tracker_report.shuttle_track_coverage_rate,
                    "interpolated_frames": tracker_report.interpolated_shuttle_frames,
                },
            ),
            StageEvidence(
                name="players",
                method="OpenCV foreground/color detector with nearest-neighbour identity tracking",
                confidence=tracker_report.player_track_coverage_rate,
                warnings=[] if tracker_report.player_raw_detection_rate >= 0.08 else ["Player tracks were heavily inferred; movement metrics are less reliable."],
                details={
                    "raw_detection_rate": tracker_report.player_raw_detection_rate,
                    "track_coverage_rate": tracker_report.player_track_coverage_rate,
                    "inferred_frames": tracker_report.inferred_player_frames,
                    "expected_players": tracker_report.expected_players,
                },
            ),
        ]

        self._progress(progress, "shot_detection", 0)
        stroke_data = self.classifier.classify_events(points, player_frames, metadata.fps, court, metadata.frame_h)

        self._progress(progress, "analytics", 0)
        metrics, tactical, shot_qualities, heatmap_paths = self.analytics.build(job_id, points, player_frames, stroke_data, metadata.fps, court)

        stage_evidence = [rally_evidence, court_evidence] + tracker_evidence
        model_info = self._model_info(metadata, stroke_data, stage_evidence, metrics)

        self._progress(progress, "rendering", 0)
        annotated_video_path = self._draw_annotated_video(segment_path, job_id, points, player_frames)
        replay = export_replay(job_id, metadata.fps, metadata.processed_frames, court, points, player_frames, stroke_data["shot_events"], shot_qualities)
        replay_path = self.config.output_dir / "replay.json"
        replay_path.write_text(json.dumps(replay, indent=2), encoding="utf-8")

        self._progress(progress, "saving", 0)
        return PipelineResult(
            metrics=metrics,
            tactical=tactical,
            model=model_info,
            replay=replay,
            shot_events=stroke_data["shot_events"],
            shot_qualities=shot_qualities,
            player_tracks=self.analytics._flatten_player_tracks(player_frames, metadata.fps),
            artifacts=PipelineArtifacts(annotated_video_path=annotated_video_path, replay_path=replay_path, heatmap_paths=heatmap_paths),
        )

    def _patch_player_court_coords(self, player_frames: list[list[dict]], court) -> list[list[dict]]:
        patched = []
        for players in player_frames:
            row = []
            for player in players:
                px, py = player.get("center_px", [None, None])
                if px is not None and py is not None:
                    mx, my = court.pixel_to_court(px, py)
                    player = {**player, "center_m": [mx, my]}
                row.append(player)
            patched.append(row)
        return patched

    def _draw_annotated_video(self, upload_path: Path, job_id: str, shuttle_points: list[dict | None], player_frames: list[list[dict]]) -> Path:
        cap = cv2.VideoCapture(str(upload_path))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)
        out_path = self.config.output_dir / "annotated.mp4"
        writer = cv2.VideoWriter(str(out_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
        for i, point in enumerate(shuttle_points):
            ok, frame = cap.read()
            if not ok:
                frame = np.zeros((h, w, 3), dtype=np.uint8)
            if point:
                cv2.circle(frame, (int(point["px"]), int(point["py"])), 8, (0, 255, 255), -1)
            for p in player_frames[i] if i < len(player_frames) else []:
                x1, y1, x2, y2 = [int(v) for v in p["bbox"]]
                color = (255, 80, 50) if p.get("team") == 0 else (50, 70, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, f"P{p.get('track_id')}", (x1, max(y1 - 8, 0)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            writer.write(frame)
        cap.release()
        writer.release()
        return out_path

    def _model_info(self, metadata, stroke_data: dict[str, Any], evidence: list[StageEvidence], metrics: dict[str, Any]) -> dict[str, Any]:
        warnings = [warning for stage in evidence for warning in stage.warnings]
        confidence_score = round(float(sum(max(0, min(1, stage.confidence)) for stage in evidence) / max(len(evidence), 1)), 3)
        shot_count = len(stroke_data.get("shot_events", []))
        confidence = "high" if confidence_score >= 0.72 and shot_count >= 6 else "medium" if confidence_score >= 0.38 or shot_count else "low"
        return {
            "name": "local-cv-pipeline-v1",
            "method": "modular rally/court/tracking/shots/analytics pipeline (OpenCV, no GPU or external API)",
            "analysis_confidence": confidence,
            "confidence_score": confidence_score,
            "warnings": warnings[:8],
            "stages": [
                {"name": stage.name, "method": stage.method, "confidence": round(float(stage.confidence), 3), "warnings": stage.warnings, "details": stage.details}
                for stage in evidence
            ],
            "evidence": {
                "shot_events_detected": shot_count,
                "event_threshold_km_h": stroke_data.get("event_threshold_km_h", 0),
                "max_speed_km_h": metrics.get("max_shuttle_speed_km_h", 0),
                "avg_speed_km_h": metrics.get("avg_shuttle_speed_km_h", 0),
                "video_frames_reported": metadata.total_frames,
                "frames_analyzed": metadata.processed_frames,
            },
        }

    def _progress(self, progress: ProgressCallback | None, stage: str, frame_no: int) -> None:
        if progress:
            progress(stage, frame_no)
