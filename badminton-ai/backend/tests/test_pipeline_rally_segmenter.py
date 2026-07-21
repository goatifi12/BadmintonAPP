from __future__ import annotations

from pathlib import Path

import numpy as np

from app.pipeline.models import VideoMetadata
from app.pipeline.rally_segmenter import RallySegmenter


def test_motion_window_caps_seek_samples(monkeypatch, tmp_path: Path) -> None:
    class FakeCapture:
        def __init__(self, path: str) -> None:
            self.positions: list[int] = []

        def set(self, prop: int, value: float) -> None:
            self.positions.append(int(value))

        def read(self):
            value = len(self.positions) % 255
            return True, np.full((20, 20, 3), value, dtype=np.uint8)

        def release(self) -> None:
            pass

    fake = FakeCapture("clip.mp4")
    monkeypatch.setenv("RALLY_SCAN_MAX_SAMPLES", "5")
    monkeypatch.setattr("app.pipeline.rally_segmenter.cv2.VideoCapture", lambda path: fake)
    segmenter = RallySegmenter(tmp_path)
    metadata = VideoMetadata(path=tmp_path / "clip.mp4", fps=30.0, total_frames=10_000, processed_frames=10_000, frame_w=20, frame_h=20)

    segmenter._motion_window(tmp_path / "clip.mp4", metadata)

    assert len(fake.positions) == 5


def test_rally_segmenter_defaults_to_unlimited_frames(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.delenv("MAX_RALLY_FRAMES", raising=False)
    segmenter = RallySegmenter(tmp_path)

    assert segmenter.max_frames is None
