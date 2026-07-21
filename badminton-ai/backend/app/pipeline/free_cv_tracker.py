from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import cv2
import numpy as np


@dataclass
class FreeModelReport:
    shuttle_detection_rate: float
    player_detection_rate: float
    frames_analyzed: int
    avg_shuttle_confidence: float = 0.0
    shuttle_track_coverage_rate: float = 0.0
    player_raw_detection_rate: float = 0.0
    player_track_coverage_rate: float = 0.0
    player_frames_detected: int = 0
    shuttle_frames_detected: int = 0
    inferred_player_frames: int = 0
    interpolated_shuttle_frames: int = 0
    expected_players: int = 2
    per_player_raw_frames: dict[str, int] | None = None
    per_player_track_frames: dict[str, int] | None = None
    method: str = "OpenCV motion + court geometry"


class FreeBadmintonModel:
    """A free, from-scratch computer-vision tracker built on OpenCV primitives.

    Not a neural network wrapper — it combines frame differencing,
    colour/brightness candidate scoring, contour filtering, nearest-neighbour
    continuity, and court-space ID stabilisation. This is the always-available
    fallback path; a hosted or GPU-based tracker can implement the same
    `analyze_video(...) -> (shuttle_points, player_frames, report)` contract
    and be swapped in ahead of it later without touching the orchestrator.
    """

    def __init__(self) -> None:
        self.report = FreeModelReport(0, 0, 0)

    def analyze_video(
        self,
        video_path: Path,
        total_frames: int,
        frame_w: int,
        frame_h: int,
        court,
        max_players: int = 2,
        progress: Callable[[str, int], None] | None = None,
    ) -> tuple[list[dict | None], list[list[dict]], FreeModelReport]:
        cap = cv2.VideoCapture(str(video_path))
        bg = cv2.createBackgroundSubtractorMOG2(history=180, varThreshold=32, detectShadows=True)
        previous_gray = None
        shuttle_points: list[dict | None] = []
        player_frames: list[list[dict]] = []
        last_shuttle: tuple[float, float] | None = None

        for frame_no in range(total_frames):
            ok, frame = cap.read()
            if not ok:
                break
            if frame_no % 2 == 0:
                bg.apply(frame)

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            motion = self._motion_mask(gray, previous_gray)
            previous_gray = gray

            shuttle = self._find_shuttle(frame, motion, frame_no, last_shuttle)
            if shuttle:
                last_shuttle = (shuttle["px"], shuttle["py"])
            shuttle_points.append(shuttle)

            fg = bg.apply(frame, learningRate=0.005)
            players = self._find_players(frame, fg, motion, court, max_players)
            player_frames.append(players)

            if progress and frame_no % 30 == 0:
                progress("tracking", frame_no)

        cap.release()
        if len(shuttle_points) < total_frames:
            shuttle_points.extend([None] * (total_frames - len(shuttle_points)))
        if len(player_frames) < total_frames:
            player_frames.extend([[] for _ in range(total_frames - len(player_frames))])

        raw_player_slots_detected = sum(len(p) for p in player_frames)
        raw_shuttle_frames_detected = sum(1 for p in shuttle_points if p)
        shuttle_points, interpolated_shuttle_frames = self._interpolate_shuttle_track(shuttle_points)
        player_frames = self._stabilize_players(player_frames, max_players)
        player_frames = self._ensure_player_slots(player_frames, total_frames, frame_w, frame_h, court, max_players)
        shuttle_confidences = [float(p.get("confidence", 0)) for p in shuttle_points if p]
        shuttle_track_frames = sum(1 for p in shuttle_points if p)
        player_track_slots = sum(len(p) for p in player_frames)
        inferred_player_frames = sum(1 for players in player_frames for p in players if p.get("inferred"))
        per_player_raw_frames = self._per_player_counts(player_frames, detected_only=True)
        per_player_track_frames = self._per_player_counts(player_frames, detected_only=False)
        total_player_slots = max(total_frames * max_players, 1)
        self.report = FreeModelReport(
            shuttle_detection_rate=round(raw_shuttle_frames_detected / max(total_frames, 1), 3),
            player_detection_rate=round(player_track_slots / total_player_slots, 3),
            frames_analyzed=total_frames,
            avg_shuttle_confidence=round(float(np.mean(shuttle_confidences or [0])), 3),
            shuttle_track_coverage_rate=round(shuttle_track_frames / max(total_frames, 1), 3),
            player_raw_detection_rate=round(raw_player_slots_detected / total_player_slots, 3),
            player_track_coverage_rate=round(player_track_slots / total_player_slots, 3),
            player_frames_detected=player_track_slots,
            shuttle_frames_detected=raw_shuttle_frames_detected,
            inferred_player_frames=inferred_player_frames,
            interpolated_shuttle_frames=interpolated_shuttle_frames,
            expected_players=max_players,
            per_player_raw_frames=per_player_raw_frames,
            per_player_track_frames=per_player_track_frames,
        )
        return shuttle_points[:total_frames], player_frames[:total_frames], self.report

    def _motion_mask(self, gray: np.ndarray, previous_gray: np.ndarray | None) -> np.ndarray:
        if previous_gray is None:
            return np.zeros_like(gray)
        delta = cv2.absdiff(gray, previous_gray)
        _, motion = cv2.threshold(delta, 18, 255, cv2.THRESH_BINARY)
        motion = cv2.medianBlur(motion, 3)
        return cv2.dilate(motion, np.ones((3, 3), np.uint8), iterations=1)

    def _find_shuttle(self, frame: np.ndarray, motion: np.ndarray, frame_no: int, last: tuple[float, float] | None) -> dict | None:
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        white = cv2.inRange(hsv, np.array([0, 0, 165]), np.array([180, 75, 255]))
        yellow = cv2.inRange(hsv, np.array([18, 45, 120]), np.array([45, 255, 255]))
        candidate_mask = cv2.bitwise_and(cv2.bitwise_or(white, yellow), motion)
        candidate_mask = cv2.morphologyEx(candidate_mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        contours, _ = cv2.findContours(candidate_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        best = None
        best_score = -1.0
        h, w = frame.shape[:2]
        for c in contours:
            area = cv2.contourArea(c)
            if area < 2 or area > max(220, w * h * 0.0008):
                continue
            x, y, bw, bh = cv2.boundingRect(c)
            aspect = bw / max(bh, 1)
            if aspect < 0.25 or aspect > 4.0:
                continue
            cx, cy = x + bw / 2, y + bh / 2
            local_motion = float(np.mean(motion[max(0, y - 1): y + bh + 1, max(0, x - 1): x + bw + 1])) / 255
            smallness = 1.0 - min(area / 220, 1.0)
            continuity = 0.5
            if last:
                dist = np.hypot(cx - last[0], cy - last[1])
                continuity = max(0.0, 1.0 - dist / max(w, h))
            score = local_motion * 1.5 + smallness + continuity
            if score > best_score:
                best_score = score
                best = {"frame": frame_no, "px": float(cx), "py": float(cy), "confidence": round(min(score / 3, 1), 3), "detected": True}
        return best

    def _find_players(self, frame: np.ndarray, foreground: np.ndarray, motion: np.ndarray, court, max_players: int) -> list[dict]:
        h, w = frame.shape[:2]
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        foreground_mask = cv2.threshold(foreground, 180, 255, cv2.THRESH_BINARY)[1]
        bright_mask = cv2.inRange(hsv, np.array([0, 0, 120]), np.array([180, 95, 255]))
        saturated_mask = cv2.inRange(hsv, np.array([0, 55, 55]), np.array([180, 255, 255]))
        court_green = cv2.inRange(hsv, np.array([35, 35, 35]), np.array([105, 255, 235]))
        non_court = cv2.bitwise_not(court_green)
        candidate_mask = cv2.bitwise_or(foreground_mask, cv2.bitwise_or(bright_mask, saturated_mask))
        candidate_mask = cv2.bitwise_and(candidate_mask, non_court)
        motion_big = cv2.dilate(motion, np.ones((13, 13), np.uint8), iterations=2)
        mask = cv2.bitwise_or(candidate_mask, cv2.bitwise_and(motion_big, non_court))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((17, 17), np.uint8))
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        candidates = []
        min_area = max(w * h * 0.006, 120)
        for c in contours:
            x, y, bw, bh = cv2.boundingRect(c)
            area = bw * bh
            if area < min_area or bh < h * 0.10:
                continue
            if bw > w * 0.5 or bh > h * 0.85:
                continue
            if y < h * 0.02 or y + bh > h * 0.99:
                continue
            cx, cy = x + bw / 2, y + bh * 0.88
            mx, my = court.pixel_to_court(cx, cy)
            pose = "jumping" if bh < bw * 1.4 else "crouching" if bh < h * 0.22 else "upright"
            candidates.append(
                {
                    "raw_id": len(candidates) + 1,
                    "bbox": [float(x), float(y), float(x + bw), float(y + bh)],
                    "center_px": [float(cx), float(cy)],
                    "center_m": [float(mx), float(my)],
                    "pose_label": pose,
                    "racket_wrist": [float(cx + bw * 0.25), float(y + bh * 0.35)],
                    "confidence": round(min(area / max(w * h * 0.08, 1), 1.0), 3),
                    "inferred": False,
                    "area": area,
                }
            )
        candidates.sort(key=lambda p: p["area"], reverse=True)
        return candidates[: max_players * 2]

    def _stabilize_players(self, frames: list[list[dict]], max_players: int) -> list[list[dict]]:
        stabilized = []
        previous: dict[int, dict] = {}
        missed: dict[int, int] = {}
        max_carry = 45
        priors = self._identity_priors(max_players)
        for frame_players in frames:
            row = []
            used = set()
            candidates = sorted(frame_players, key=lambda p: p.get("confidence", 0), reverse=True)
            for player in candidates:
                preferred = self._assign_identity(player, priors, previous, used)
                if preferred is None:
                    continue
                used.add(preferred)
                team = priors[preferred]["team"]
                clean = {k: v for k, v in player.items() if k not in ("raw_id", "area")}
                clean.update({"track_id": preferred, "team": team, "identity_role": priors[preferred]["role"]})
                previous[preferred] = clean
                missed[preferred] = 0
                row.append(clean)
            for pid in range(1, max_players + 1):
                if pid in used or pid not in previous:
                    continue
                gap = missed.get(pid, 0) + 1
                if gap > max_carry:
                    continue
                carried = {**previous[pid]}
                carried["inferred"] = True
                carried["confidence"] = round(max(0.15, float(carried.get("confidence", 0.4)) * (1 - gap / (max_carry + 8))), 3)
                missed[pid] = gap
                row.append(carried)
            stabilized.append(sorted(row, key=lambda p: p["track_id"]))
        return stabilized

    def _assign_identity(self, player: dict, priors: dict[int, dict], previous: dict[int, dict], used: set[int]) -> int | None:
        px, py = player.get("center_px", [0, 0])
        mx, my = player.get("center_m", [3.05, 6.7])
        best_id = None
        best_cost = float("inf")
        for pid, prior in priors.items():
            if pid in used:
                continue
            prior_cost = np.hypot(mx - prior["mx"], my - prior["my"]) * 28
            side_penalty = 0
            if prior["team"] == 0 and my < 6.7:
                side_penalty += 90
            if prior["team"] == 1 and my >= 6.7:
                side_penalty += 90
            continuity_cost = 0
            if pid in previous:
                old_px, old_py = previous[pid].get("center_px", [px, py])
                continuity_cost = np.hypot(px - old_px, py - old_py) * 0.75
            cost = prior_cost + side_penalty + continuity_cost
            if cost < best_cost:
                best_id, best_cost = pid, cost
        return best_id if best_cost < 260 else None

    def _ensure_player_slots(self, frames: list[list[dict]], total_frames: int, frame_w: int, frame_h: int, court, max_players: int) -> list[list[dict]]:
        priors = self._identity_priors(max_players)
        previous: dict[int, dict] = {}
        out = []
        for frame_no in range(total_frames):
            current = {int(p["track_id"]): p for p in (frames[frame_no] if frame_no < len(frames) else [])}
            row = []
            for pid in range(1, max_players + 1):
                if pid in current:
                    previous[pid] = current[pid]
                    row.append(current[pid])
                elif pid in previous:
                    carried = {**previous[pid], "inferred": True, "confidence": max(0.12, float(previous[pid].get("confidence", 0.35)) * 0.85)}
                    row.append(carried)
                else:
                    row.append(self._prior_player(pid, priors[pid], frame_w, frame_h, court))
            out.append(sorted(row, key=lambda p: p["track_id"]))
        return out

    def _interpolate_shuttle_track(self, points: list[dict | None]) -> tuple[list[dict | None], int]:
        if not any(points):
            return points, 0
        filled = points[:]
        interpolated = 0
        known = [i for i, p in enumerate(points) if p]
        for start, end in zip(known, known[1:]):
            gap = end - start
            if gap <= 1 or gap > 75:
                continue
            a, b = points[start], points[end]
            if not a or not b:
                continue
            for i in range(start + 1, end):
                t = (i - start) / gap
                arc = np.sin(t * np.pi) * min(18, gap * 0.25)
                filled[i] = {
                    "frame": i,
                    "px": float(a["px"] + (b["px"] - a["px"]) * t),
                    "py": float(a["py"] + (b["py"] - a["py"]) * t - arc),
                    "confidence": round(max(0.18, 0.45 * (1 - abs(0.5 - t))), 3),
                    "detected": False,
                    "inferred": True,
                }
                interpolated += 1
        return filled, interpolated

    def _identity_priors(self, max_players: int) -> dict[int, dict]:
        if max_players >= 4:
            return {
                1: {"team": 0, "mx": 1.75, "my": 10.4, "role": "near_left"},
                2: {"team": 1, "mx": 1.75, "my": 3.0, "role": "far_left"},
                3: {"team": 0, "mx": 4.35, "my": 10.4, "role": "near_right"},
                4: {"team": 1, "mx": 4.35, "my": 3.0, "role": "far_right"},
            }
        return {
            1: {"team": 0, "mx": 3.05, "my": 10.6, "role": "near"},
            2: {"team": 1, "mx": 3.05, "my": 2.8, "role": "far"},
        }

    def _prior_player(self, pid: int, prior: dict, frame_w: int, frame_h: int, court) -> dict:
        px, py = court.court_to_pixel(prior["mx"], prior["my"])
        box_w = max(28, frame_w * 0.055)
        box_h = max(64, frame_h * 0.22)
        return {
            "track_id": pid,
            "team": prior["team"],
            "identity_role": prior["role"],
            "bbox": [float(px - box_w / 2), float(py - box_h), float(px + box_w / 2), float(py)],
            "center_px": [float(px), float(py)],
            "center_m": [float(prior["mx"]), float(prior["my"])],
            "pose_label": "upright",
            "racket_wrist": [float(px + box_w * 0.35), float(py - box_h * 0.45)],
            "confidence": 0.12,
            "inferred": True,
        }

    def _per_player_counts(self, frames: list[list[dict]], detected_only: bool) -> dict[str, int]:
        counts: dict[str, int] = {}
        for players in frames:
            for player in players:
                if detected_only and player.get("inferred"):
                    continue
                pid = str(player.get("track_id"))
                counts[pid] = counts.get(pid, 0) + 1
        return counts
