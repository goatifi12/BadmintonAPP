"""
player_tracker_v2.py

FIX: Old code took the first N detections by Y position but YOLO
frequently returns 3-4 people (referees, spectators, line judges).

New approach:
  1. Filter to only 'person' class (cls=0).
  2. Require minimum bounding box area (removes small far-away people).
  3. Keep only the N LARGEST bboxes (players are always closest to
     camera = biggest in frame).
  4. Assign team by Y position (bottom half = team 0, top half = team 1).

This means for singles you'll always get exactly 2 players and never
see referees or spectators in your data.
"""
from ultralytics import YOLO
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

KEYPOINT_NAMES = [
    'nose','left_eye','right_eye','left_ear','right_ear',
    'left_shoulder','right_shoulder','left_elbow','right_elbow',
    'left_wrist','right_wrist','left_hip','right_hip',
    'left_knee','right_knee','left_ankle','right_ankle'
]
KP = {name: i for i, name in enumerate(KEYPOINT_NAMES)}


@dataclass
class PlayerState:
    track_id:    int
    team:        int
    bbox:        List[float]
    center_px:   Tuple[float, float]
    center_m:    Optional[Tuple[float, float]] = None
    keypoints:   Optional[np.ndarray] = None
    pose_label:  str = "upright"
    racket_wrist: Optional[Tuple[float, float]] = None


@dataclass
class FramePlayerData:
    frame_idx: int
    players:   Dict[int, PlayerState] = field(default_factory=dict)
    mode:      str = "singles"


class PlayerTrackerV2:
    def __init__(self, model_path: str = "yolov8m-pose.pt", mode: str = "singles"):
        self.model      = YOLO(model_path)
        self.mode       = mode
        self.max_players = 2 if mode == "singles" else 4

        # Minimum bbox area as fraction of frame area.
        # Players close to the camera are large; spectators are tiny.
        # 0.02 = bbox must cover at least 2% of the frame.
        self.min_area_fraction = 0.015

    def detect_frame(
        self,
        frame: np.ndarray,
        frame_idx: int,
        court_detector=None,
    ) -> FramePlayerData:
        frame_area = frame.shape[0] * frame.shape[1]
        min_area   = frame_area * self.min_area_fraction

        results = self.model.track(
            frame, persist=True, conf=0.35,
            classes=[0],        # person only
            imgsz=1280, verbose=False,
        )[0]

        fd = FramePlayerData(frame_idx=frame_idx, mode=self.mode)
        if results.boxes is None:
            return fd

        # ── Collect all person detections with area ───────────────
        candidates = []
        for i, box in enumerate(results.boxes):
            if box.id is None:
                continue
            tid  = int(box.id.item())
            bbox = box.xyxy.tolist()[0]
            w    = bbox[2] - bbox[0]
            h    = bbox[3] - bbox[1]
            area = w * h
            if area < min_area:
                continue   # too small = spectator / referee

            kps = None
            if results.keypoints is not None and i < len(results.keypoints.data):
                kps = results.keypoints.data[i].cpu().numpy()

            candidates.append((tid, bbox, area, kps))

        # ── Keep only the N largest (players closest to camera) ───
        candidates.sort(key=lambda x: x[2], reverse=True)
        kept = candidates[: self.max_players]

        frame_h = frame.shape[0]

        for tid, bbox, area, kps in kept:
            cx = (bbox[0] + bbox[2]) / 2
            cy = (bbox[1] + bbox[3]) / 2

            # Team 0 = bottom half of frame (near side)
            # Team 1 = top half of frame (far side)
            team = 0 if cy > frame_h / 2 else 1

            racket_wrist = None
            if kps is not None:
                rw = kps[KP['right_wrist']]
                lw = kps[KP['left_wrist']]
                if rw[2] > 0.4:
                    racket_wrist = (float(rw[0]), float(rw[1]))
                elif lw[2] > 0.4:
                    racket_wrist = (float(lw[0]), float(lw[1]))

            pose = self._classify_pose(kps)

            center_m = None
            if court_detector and court_detector.homography:
                try:
                    center_m = court_detector.pixel_to_court(cx, cy)
                except Exception:
                    pass

            fd.players[tid] = PlayerState(
                track_id=tid, team=team, bbox=bbox,
                center_px=(cx, cy), center_m=center_m,
                keypoints=kps, pose_label=pose,
                racket_wrist=racket_wrist,
            )

        return fd

    def detect_video(
        self,
        frames: List[np.ndarray],
        court_detector=None,
    ) -> List[FramePlayerData]:
        results = []
        for i, frame in enumerate(frames):
            fd = self.detect_frame(frame, i, court_detector)
            results.append(fd)
            if i % 100 == 0:
                ids = list(fd.players.keys())
                print(f"  Player tracking: {i}/{len(frames)} — players: {ids}")
        return results

    def _classify_pose(self, kps: Optional[np.ndarray]) -> str:
        if kps is None:
            return "upright"
        hip_y     = kps[KP['left_hip']][1]
        knee_y    = kps[KP['left_knee']][1]
        ankle_y   = kps[KP['left_ankle']][1]
        shoulder_y = kps[KP['left_shoulder']][1]

        if min(kps[KP['left_hip']][2], kps[KP['left_knee']][2]) < 0.3:
            return "upright"

        torso_h = abs(shoulder_y - hip_y)
        leg_h   = abs(hip_y - ankle_y)
        if torso_h < 40:
            return "jumping"
        ratio = (knee_y - hip_y) / max(leg_h, 1)
        return "crouching" if ratio > 0.5 else "upright"

    def draw_players(
        self,
        frames: List[np.ndarray],
        player_data: List[FramePlayerData],
    ) -> List[np.ndarray]:
        import cv2
        colors = {0: (0, 60, 255), 1: (255, 80, 0), 2: (0, 200, 80), 3: (200, 0, 200)}
        out = []
        for frame, fd in zip(frames, player_data):
            f = frame.copy()
            for tid, ps in fd.players.items():
                c = colors.get(tid % 4, (255, 255, 0))
                x1, y1, x2, y2 = [int(v) for v in ps.bbox]
                cv2.rectangle(f, (x1, y1), (x2, y2), c, 2)
                label = f"P{tid} T{ps.team} {ps.pose_label}"
                cv2.putText(f, label, (x1, y1 - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, c, 2)
                if ps.racket_wrist:
                    cv2.circle(f, (int(ps.racket_wrist[0]),
                                   int(ps.racket_wrist[1])), 6, (0, 255, 255), -1)
            out.append(f)
        return out