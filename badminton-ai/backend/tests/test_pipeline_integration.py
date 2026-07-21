from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from app.pipeline.orchestrator import CVPipeline, PipelineConfig


def _synthetic_match_clip(path: Path, frames: int = 40, size: tuple[int, int] = (160, 120)) -> Path:
    """A tiny synthetic clip: a green "court" background, a bright moving dot
    (shuttle proxy) arcing across the frame, and two large bright blobs
    (player proxies) that shift position — enough motion/contrast for the
    free OpenCV tracker to have something to chase, without needing real
    match footage.
    """
    w, h = size
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 15, (w, h))
    for i in range(frames):
        frame = np.full((h, w, 3), (60, 140, 60), dtype=np.uint8)  # green court
        t = i / max(frames - 1, 1)

        shuttle_x = int(20 + t * (w - 40))
        shuttle_y = int(h * 0.5 - 30 * np.sin(t * np.pi))
        cv2.circle(frame, (shuttle_x, shuttle_y), 3, (245, 245, 245), -1)

        p1_x = int(w * 0.25 + 10 * np.sin(t * 6))
        p2_x = int(w * 0.75 + 10 * np.cos(t * 6))
        cv2.rectangle(frame, (p1_x - 8, h - 40), (p1_x + 8, h - 5), (30, 30, 220), -1)
        cv2.rectangle(frame, (p2_x - 8, 5), (p2_x + 8, 40), (220, 30, 30), -1)

        writer.write(frame)
    writer.release()
    return path


def test_cv_pipeline_runs_end_to_end_on_synthetic_clip(tmp_path: Path) -> None:
    video_path = _synthetic_match_clip(tmp_path / "clip.mp4")
    output_dir = tmp_path / "outputs"
    output_dir.mkdir()

    pipeline = CVPipeline(PipelineConfig(output_dir=output_dir))
    stages_seen: list[str] = []

    result = pipeline.run("job-1", video_path, "singles", progress=lambda stage, frame: stages_seen.append(stage))

    # Every documented stage actually ran.
    for expected_stage in ["rally_segmentation", "court_calibration", "tracking", "shot_detection", "analytics", "rendering", "saving"]:
        assert expected_stage in stages_seen

    # Structural shape of the result, matching what the Celery task persists.
    assert "avg_shuttle_speed_km_h" in result.metrics
    assert "shot_stats" in result.metrics
    assert "heatmaps" in result.tactical
    assert "weaknesses" in result.tactical
    assert result.model["name"] == "local-cv-pipeline-v1"
    assert "stages" in result.model

    # Real files were written to disk, not just returned in memory.
    assert result.artifacts.replay_path.exists()
    assert result.artifacts.annotated_video_path.exists()
    assert result.artifacts.annotated_video_path.stat().st_size > 0
    assert all(path.exists() for path in result.artifacts.heatmap_paths.values())


def test_cv_pipeline_handles_an_undecodable_upload_without_crashing(tmp_path: Path) -> None:
    bogus_path = tmp_path / "not-a-video.mp4"
    bogus_path.write_bytes(b"this is not a real video file")
    output_dir = tmp_path / "outputs"
    output_dir.mkdir()

    pipeline = CVPipeline(PipelineConfig(output_dir=output_dir))

    result = pipeline.run("job-2", bogus_path, "singles")

    assert result.metrics["shot_stats"]["total_shots"] == 0
    assert result.model["analysis_confidence"] == "low"
    assert result.artifacts.replay_path.exists()
