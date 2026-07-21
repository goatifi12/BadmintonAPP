from __future__ import annotations

import os
from pathlib import Path

import cv2
import numpy as np

from app.pipeline.models import StageEvidence, VideoMetadata
from app.pipeline.video_io import _optional_frame_limit, inspect_video


class RallySegmenter:
    """Cheap pre-inference gate that bounds work before detector stages run."""

    def __init__(self, output_dir: Path) -> None:
        self.output_dir = output_dir
        self.max_frames = _optional_frame_limit("MAX_RALLY_FRAMES")
        self.max_scan_samples = int(os.environ.get("RALLY_SCAN_MAX_SAMPLES", "120") or "120")

    def segment(self, job_id: str, upload_path: Path, metadata: VideoMetadata) -> tuple[Path, VideoMetadata, np.ndarray | None, StageEvidence]:
        start, end = self._motion_window(upload_path, metadata)
        if end <= start:
            start, end = 0, metadata.total_frames
        if self.max_frames:
            end = min(end, start + self.max_frames, metadata.total_frames)
        else:
            end = min(end, metadata.total_frames)
        segment_path = self.output_dir / f"{job_id}_rally_segment.mp4"
        self._write_segment(upload_path, segment_path, start, end, metadata)
        segment_metadata, first_frame = inspect_video(segment_path)
        capped = bool(self.max_frames and metadata.total_frames > self.max_frames)
        evidence = StageEvidence(
            name="rally_segmentation",
            method="pre-inference motion gate",
            confidence=0.8 if end > start else 0.2,
            warnings=[] if not capped else [f"Analysis bounded to rally frames {start}-{end}; set MAX_RALLY_FRAMES=0 or unset it for unlimited frames."],
            details={"start_frame": start, "end_frame": end, "max_rally_frames": self.max_frames, "source_total_frames": metadata.total_frames},
        )
        return segment_path, segment_metadata, first_frame, evidence

    def _motion_window(self, path: Path, metadata: VideoMetadata) -> tuple[int, int]:
        cap = cv2.VideoCapture(str(path))
        previous = None
        samples: list[tuple[int, float]] = []
        sample_count = max(1, min(self.max_scan_samples, metadata.total_frames))
        if sample_count >= metadata.total_frames:
            frame_numbers = range(metadata.total_frames)
        else:
            frame_numbers = np.linspace(0, metadata.total_frames - 1, sample_count, dtype=int).tolist()
        for frame_no in frame_numbers:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
            ok, frame = cap.read()
            if not ok:
                continue
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            score = 0.0 if previous is None else float(np.mean(cv2.absdiff(gray, previous)))
            samples.append((frame_no, score))
            previous = gray
        cap.release()
        active = [frame for frame, score in samples if score > 2.5]
        if not active:
            return 0, metadata.total_frames
        pad = int(metadata.fps * 2)
        return max(0, min(active) - pad), min(metadata.total_frames, max(active) + pad)

    def _write_segment(self, source: Path, dest: Path, start: int, end: int, metadata: VideoMetadata) -> None:
        cap = cv2.VideoCapture(str(source))
        cap.set(cv2.CAP_PROP_POS_FRAMES, start)
        writer = cv2.VideoWriter(str(dest), cv2.VideoWriter_fourcc(*"mp4v"), metadata.fps, (metadata.frame_w, metadata.frame_h))
        for _ in range(max(1, end - start)):
            ok, frame = cap.read()
            if not ok:
                break
            writer.write(frame)
        cap.release()
        writer.release()
