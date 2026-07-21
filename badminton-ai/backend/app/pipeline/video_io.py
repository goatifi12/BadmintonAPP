from __future__ import annotations

import os
from pathlib import Path

import cv2
import numpy as np

from app.pipeline.models import VideoMetadata


def _optional_frame_limit(env_var: str) -> int | None:
    """Read a positive integer frame cap from an env var. Unset, empty, zero,
    or negative values all mean "unlimited" — the pipeline processes the full
    video unless someone explicitly opts into a smaller bound.
    """
    raw = os.environ.get(env_var)
    if not raw:
        return None
    try:
        value = int(raw)
    except ValueError:
        return None
    return value if value > 0 else None


def inspect_video(path: Path) -> tuple[VideoMetadata, np.ndarray | None]:
    """Read basic metadata and the first frame without decoding the whole file."""
    cap = cv2.VideoCapture(str(path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

        ok, first_frame = cap.read()
        if not ok:
            first_frame = None
        elif frame_w == 0 or frame_h == 0:
            frame_h, frame_w = first_frame.shape[:2]

        if total_frames <= 0:
            # Some containers report an unreliable frame count; fall back to a
            # full manual scan so downstream stages get an accurate bound.
            total_frames = 1 if first_frame is not None else 0
            while True:
                ok, _ = cap.read()
                if not ok:
                    break
                total_frames += 1
            cap.release()
            cap = cv2.VideoCapture(str(path))
            cap.read()  # re-prime so first_frame semantics stay consistent
    finally:
        cap.release()

    caps = [c for c in (_optional_frame_limit("MAX_ANALYSIS_FRAMES"), _optional_frame_limit("MAX_RALLY_FRAMES")) if c]
    processed_frames = min([total_frames, *caps]) if caps else total_frames

    metadata = VideoMetadata(path=path, fps=float(fps), total_frames=total_frames, processed_frames=processed_frames, frame_w=frame_w, frame_h=frame_h)
    return metadata, first_frame


def validate_video_header(path: Path) -> tuple[bool, str]:
    """Cheap sanity check that a file is a decodable video before the pipeline
    spends real time on it.
    """
    if not path.exists() or path.stat().st_size == 0:
        return False, "Uploaded file is empty or missing."
    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened():
            return False, "Video could not be opened. It may be corrupted or in an unsupported format."
        ok, _ = cap.read()
        if not ok:
            return False, "Video has no readable frames."
    finally:
        cap.release()
    return True, "ok"
