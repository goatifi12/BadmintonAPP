from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from app.pipeline.video_io import inspect_video, validate_video_header


def _write_video(path: Path, frames: int) -> Path:
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 10, (32, 24))
    for i in range(frames):
        writer.write(np.full((24, 32, 3), i % 255, dtype=np.uint8))
    writer.release()
    return path


def test_inspect_video_has_no_default_frame_cap(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.delenv("MAX_RALLY_FRAMES", raising=False)
    monkeypatch.delenv("MAX_ANALYSIS_FRAMES", raising=False)
    metadata, _ = inspect_video(_write_video(tmp_path / "clip.mp4", 12))

    assert metadata.total_frames == 12
    assert metadata.processed_frames == 12


def test_inspect_video_respects_explicit_positive_frame_cap(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("MAX_RALLY_FRAMES", "5")
    metadata, _ = inspect_video(_write_video(tmp_path / "capped.mp4", 12))

    assert metadata.total_frames == 12
    assert metadata.processed_frames == 5


def test_validate_video_header_accepts_real_video(tmp_path: Path) -> None:
    ok, message = validate_video_header(_write_video(tmp_path / "valid.mp4", 3))
    assert ok is True
    assert message == "ok"


def test_validate_video_header_rejects_missing_file(tmp_path: Path) -> None:
    ok, message = validate_video_header(tmp_path / "does-not-exist.mp4")
    assert ok is False
    assert "empty or missing" in message


def test_validate_video_header_rejects_garbage_bytes(tmp_path: Path) -> None:
    path = tmp_path / "garbage.mp4"
    path.write_bytes(b"not a real video file")
    ok, _ = validate_video_header(path)
    assert ok is False
