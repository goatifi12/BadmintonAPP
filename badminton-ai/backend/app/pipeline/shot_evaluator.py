from __future__ import annotations

from dataclasses import dataclass, asdict
from math import hypot

NORMS = {
    "smash": {"min": 80, "optimal": 250, "max": 420},
    "clear": {"min": 50, "optimal": 120, "max": 200},
    "drop": {"min": 15, "optimal": 55, "max": 100},
    "drive": {"min": 60, "optimal": 130, "max": 200},
    "lift": {"min": 30, "optimal": 80, "max": 140},
    "net": {"min": 10, "optimal": 35, "max": 65},
    "unknown": {"min": 0, "optimal": 60, "max": 180},
}

IDEAL_ZONES = {
    "smash": [(0.2, 0.85), (0.8, 0.85)],
    "drop": [(0.3, 0.1), (0.7, 0.1)],
    "clear": [(0.1, 0.95), (0.9, 0.95)],
    "drive": [(0.05, 0.5), (0.95, 0.5)],
    "lift": [(0.1, 0.9), (0.9, 0.9)],
    "net": [(0.4, 0.05), (0.6, 0.05)],
    "unknown": [(0.5, 0.5)],
}


@dataclass
class ShotQuality:
    score: int
    grade: str
    execution_score: float
    placement_score: float
    pressure_score: float
    stroke_type: str
    explanation: str


class ShotEvaluator:
    def evaluate(self, shot: dict, opponent_distance_m: float = 2.5) -> dict:
        stroke = shot.get("stroke_type", "unknown")
        speed = float(shot.get("speed", 0))
        landing = shot.get("landing_norm") or self._landing_norm(shot)
        execution = self._execution(stroke, speed)
        placement = self._placement(stroke, landing)
        pressure = 20 * min(opponent_distance_m / 5.0, 1.0)
        score = int(round(execution + placement + pressure))
        grade = "Excellent" if score >= 80 else "Good" if score >= 60 else "Neutral" if score >= 40 else "Poor"
        explanation = f"{grade} {stroke} — {speed:.0f} km/h with {placement:.0f}/40 placement."
        return asdict(ShotQuality(score, grade, round(execution, 1), round(placement, 1), round(pressure, 1), stroke, explanation))

    def _execution(self, stroke: str, speed: float) -> float:
        norm = NORMS.get(stroke, NORMS["unknown"])
        span = max(norm["optimal"] - norm["min"], norm["max"] - norm["optimal"], 1)
        return 40 * max(0, 1 - abs(speed - norm["optimal"]) / span)

    def _placement(self, stroke: str, landing: tuple[float, float] | None) -> float:
        if landing is None:
            return 20.0
        distance = min(hypot(landing[0] - x, landing[1] - y) for x, y in IDEAL_ZONES.get(stroke, IDEAL_ZONES["unknown"]))
        return 40 * max(0, 1 - distance / 0.5)

    def _landing_norm(self, shot: dict) -> tuple[float, float] | None:
        landing = shot.get("landing_px")
        if not landing:
            return None
        return min(max(landing[0] / 1280, 0), 1), min(max(landing[1] / 720, 0), 1)
