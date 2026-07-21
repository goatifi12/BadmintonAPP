from __future__ import annotations

from collections import Counter
from math import asin, degrees, hypot
from statistics import mean
from typing import Any

SHOT_TYPES = ["smash", "clear", "drop", "drive", "lift", "net", "push", "flick_serve", "short_serve", "unknown"]


class TemporalShotClassifier:
    """Temporal feature classifier with a model-ready interface.

    If a trained TCN/Transformer is introduced later, it should implement the
    same `classify_events` contract and replace `_score_shot_type`.
    """

    def classify_events(self, points: list[dict | None], players: list[list[dict]], fps: float, court, frame_h: int) -> dict[str, Any]:
        speeds = self._speeds(points, fps, court)
        events = self._event_frames(speeds)
        shots: list[dict[str, Any]] = []
        previous = "unknown"
        for frame in events:
            point = points[frame] if frame < len(points) else None
            if not point:
                continue
            features = self._features(points, speeds, frame, frame_h, court)
            shot_type, confidence = self._score_shot_type(features, previous, frame, fps)
            player_id = self._nearest_player_id(features.get("contact_m"), players[frame] if frame < len(players) else [])
            shot = {
                "frame": frame,
                "timestamp": round(frame / fps, 3),
                "stroke_type": shot_type,
                "shot_type": shot_type,
                "confidence": confidence,
                "player_id": player_id,
                "player": f"Player {player_id}" if player_id else "Unknown",
                **features,
            }
            previous = shot_type
            shots.append(shot)
        counts = Counter(shot["stroke_type"] for shot in shots)
        for name in SHOT_TYPES:
            counts.setdefault(name, 0)
        return {
            "speeds": speeds,
            "shot_events": shots,
            "stroke_counts": dict(counts),
            "stroke_quality": self._aggregate_quality(shots),
            "event_threshold_km_h": self._event_threshold(speeds),
        }

    def _speeds(self, points: list[dict | None], fps: float, court) -> list[float]:
        speeds = [0.0] * len(points)
        previous_m = None
        for i, point in enumerate(points):
            if not point:
                previous_m = None
                continue
            cur_m = court.pixel_to_court(point["px"], point["py"])
            if previous_m:
                speeds[i] = round(float(hypot(cur_m[0] - previous_m[0], cur_m[1] - previous_m[1]) * fps * 3.6), 2)
            previous_m = cur_m
        return speeds

    def _event_threshold(self, speeds: list[float]) -> float:
        nonzero = sorted(s for s in speeds if s > 0)
        if not nonzero:
            return 18.0
        p80 = nonzero[int((len(nonzero) - 1) * 0.8)]
        return round(max(18.0, min(85.0, p80 * 0.72)), 2)

    def _event_frames(self, speeds: list[float]) -> list[int]:
        threshold = self._event_threshold(speeds)
        min_gap = 8
        events: list[int] = []
        last = -min_gap
        for i in range(2, len(speeds) - 2):
            window_peak = speeds[i] >= max(speeds[i - 2], speeds[i - 1], speeds[i + 1], speeds[i + 2])
            if speeds[i] >= threshold and window_peak and i - last >= min_gap:
                events.append(i)
                last = i
        return events

    def _features(self, points: list[dict | None], speeds: list[float], frame: int, frame_h: int, court) -> dict[str, Any]:
        point = points[frame] or {"px": 0, "py": 0}
        future = next((points[i] for i in range(frame + 1, min(frame + 9, len(points))) if points[i]), point)
        dx = future["px"] - point["px"]
        dy = future["py"] - point["py"]
        dist = hypot(dx, dy) or 1.0
        v_angle = degrees(asin(-dy / dist))
        contact_m = court.pixel_to_court(point["px"], point["py"])
        landing = self._landing(points, frame)
        landing_m = court.pixel_to_court(landing["px"], landing["py"]) if landing else None
        acceleration = speeds[frame] - speeds[max(frame - 3, 0)]
        return {
            "speed": float(speeds[frame]),
            "acceleration": round(float(acceleration), 2),
            "v_angle": round(v_angle, 2),
            "contact_yn": round(float(point["py"]) / max(frame_h, 1), 3),
            "contact_m": [round(contact_m[0], 3), round(contact_m[1], 3)],
            "landing_px": None if landing is None else [landing["px"], landing["py"]],
            "landing_m": None if landing_m is None else [round(landing_m[0], 3), round(landing_m[1], 3)],
            "land_yn": None if landing is None else round(float(landing["py"]) / max(frame_h, 1), 3),
        }

    def _landing(self, points: list[dict | None], frame: int) -> dict | None:
        previous_dy = None
        last = None
        for i in range(frame + 1, min(frame + 55, len(points))):
            p0, p1 = points[i - 1], points[i]
            if not p0 or not p1:
                continue
            dy = p1["py"] - p0["py"]
            last = p1
            if previous_dy is not None and ((dy >= 0 > previous_dy) or (dy <= 0 < previous_dy)):
                return p1
            previous_dy = dy
        return last

    def _score_shot_type(self, f: dict[str, Any], previous: str, frame: int, fps: float) -> tuple[str, float]:
        speed = float(f["speed"])
        angle = float(f["v_angle"])
        contact_y = float(f["contact_yn"])
        landing = f.get("landing_m")
        land_y = landing[1] / 13.4 if landing else None
        early = frame / fps < 6

        scores = {name: 0.05 for name in SHOT_TYPES}
        scores["smash"] = self._score(speed, 170, 420) + self._descending(angle, -14) + max(contact_y - 0.42, 0)
        scores["clear"] = self._score(speed, 65, 220) + self._ascending(angle, 12) + (land_y or 0)
        scores["drop"] = self._score(speed, 25, 130) + self._descending(angle, -6) + (1 - min(land_y or 0.45, 0.65))
        scores["drive"] = self._score(speed, 55, 230) + max(0, 1 - abs(angle) / 24)
        scores["lift"] = self._score(speed, 35, 170) + self._ascending(angle, 16) + max(0, 0.45 - contact_y)
        scores["net"] = self._score(speed, 8, 80) + max(0, 0.48 - contact_y) + (1 - min(land_y or 0.4, 0.55))
        scores["push"] = self._score(speed, 20, 105) + max(0, 1 - abs(angle) / 18) + max(0, 0.55 - contact_y)
        scores["flick_serve"] = (0.65 if early else 0.05) + self._ascending(angle, 18) + self._score(speed, 40, 150)
        scores["short_serve"] = (0.75 if early else 0.05) + self._score(speed, 5, 55) + (1 - min(land_y or 0.5, 0.55))
        if previous in {"short_serve", "flick_serve"}:
            scores["net"] *= 0.85

        shot_type = max(scores, key=scores.get)
        raw = scores[shot_type]
        confidence = round(float(min(0.98, max(0.35, raw / max(sum(scores.values()) / len(scores), 1e-3) / 2.2))), 3)
        return shot_type, confidence

    def _score(self, speed: float, low: float, high: float) -> float:
        if low <= speed <= high:
            mid = (low + high) / 2
            return 1.0 - abs(speed - mid) / max(high - low, 1) * 0.5
        return max(0.0, 1 - min(abs(speed - low), abs(speed - high)) / max(high - low, 1))

    def _ascending(self, angle: float, target: float) -> float:
        return max(0.0, min(1.0, (angle + 8) / max(target + 8, 1)))

    def _descending(self, angle: float, target: float) -> float:
        return max(0.0, min(1.0, (target - angle + 18) / 45))

    def _nearest_player_id(self, contact_m: list[float] | None, players: list[dict]) -> int | None:
        if not contact_m or not players:
            return None
        best = min(players, key=lambda p: hypot((p.get("center_m") or [0, 0])[0] - contact_m[0], (p.get("center_m") or [0, 0])[1] - contact_m[1]))
        return best.get("track_id")

    def _aggregate_quality(self, shots: list[dict[str, Any]]) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for stroke in SHOT_TYPES:
            group = [s for s in shots if s["stroke_type"] == stroke]
            speeds = [s["speed"] for s in group] or [0]
            land_y = [(s.get("landing_m") or [0, 0])[1] / 13.4 * 100 for s in group if s.get("landing_m")]
            if stroke == "smash":
                out[stroke] = {"count": len(group), "avg_speed": round(mean(speeds), 1), "max_speed": round(max(speeds), 1), "avg_angle": round(abs(mean([s["v_angle"] for s in group] or [0])), 1)}
            elif stroke == "clear":
                out[stroke] = {"count": len(group), "avg_apex": 0, "depth_percentage": round(mean(land_y or [0]), 1)}
            elif stroke == "drop":
                out[stroke] = {"count": len(group), "net_clearance": round(mean(land_y or [0]), 1), "accuracy": round(len(group) / max(len(shots), 1) * 100, 1)}
            elif stroke == "lift":
                deep = [y for y in land_y if y > 65]
                out[stroke] = {"count": len(group), "consistency": round(len(deep) / max(len(group), 1) * 100, 1)}
            else:
                out[stroke] = {"count": len(group), "avg_speed": round(mean(speeds), 1), "max_speed": round(max(speeds), 1)}
        return out
