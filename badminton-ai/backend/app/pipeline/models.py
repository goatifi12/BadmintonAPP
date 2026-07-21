from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

ProgressCallback = Callable[[str, int], None]


@dataclass
class VideoMetadata:
    path: Path
    fps: float
    total_frames: int
    processed_frames: int
    frame_w: int
    frame_h: int


@dataclass
class StageEvidence:
    name: str
    method: str
    confidence: float
    warnings: list[str] = field(default_factory=list)
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class PipelineArtifacts:
    annotated_video_path: Path
    replay_path: Path
    heatmap_paths: dict[str, Path]


@dataclass
class PipelineResult:
    metrics: dict[str, Any]
    tactical: dict[str, Any]
    model: dict[str, Any]
    replay: dict[str, Any]
    shot_events: list[dict[str, Any]]
    shot_qualities: list[dict[str, Any]]
    player_tracks: list[dict[str, Any]]
    artifacts: PipelineArtifacts
