"""
Shot quality scoring 0–100.
Combines execution, placement, and opponent pressure.
"""
from dataclasses import dataclass
from typing import Optional, Tuple, Dict, List
import math

@dataclass
class ShotQuality:
    score: int                  # 0–100
    grade: str                  # Excellent / Good / Neutral / Poor
    execution_score: int        # Speed + timing sub-score
    placement_score: int        # Zone + depth sub-score
    pressure_score: int         # Opponent position sub-score
    stroke_type: str
    explanation: str            # Human-readable coaching note

class ShotEvaluator:
    """
    Score each detected stroke 0–100 across three axes:
      • Execution  (40 pts): speed relative to stroke type norm, 
                             wrist snap timing from pose
      • Placement  (40 pts): zone targeting, depth, cross/straight
      • Pressure   (20 pts): opponent out of position
    """

    # Expected speed ranges per stroke type (km/h)
    STROKE_SPEED_NORMS: Dict[str, Dict] = {
        'smash': {'min': 150, 'optimal': 280, 'max': 420},
        'clear': {'min':  60, 'optimal': 130, 'max': 200},
        'drop':  {'min':  20, 'optimal':  60, 'max': 100},
        'drive': {'min':  80, 'optimal': 140, 'max': 200},
        'net':   {'min':  10, 'optimal':  40, 'max':  80},
        'lift':  {'min':  40, 'optimal':  90, 'max': 150},
    }

    # High-value target zones per stroke type
    # (court_x_pct, court_y_pct) representing normalized court fractions
    IDEAL_ZONES: Dict[str, List[Tuple[float, float]]] = {
        'smash': [(0.2, 0.75), (0.8, 0.75)],        # Deep sidelines
        'drop':  [(0.3, 0.15), (0.7, 0.15)],        # Tight to net
        'clear': [(0.1, 0.95), (0.9, 0.95)],        # Deep rear corners
        'drive': [(0.1, 0.5),  (0.9, 0.5)],         # Side tramlines
        'net':   [(0.35, 0.05),(0.65, 0.05)],       # Tight net tape
        'lift':  [(0.15, 0.85),(0.85, 0.85)],       # Deep rear wide
    }

    def evaluate(
        self,
        stroke_type: str,
        speed_km_h: float,
        landing_m: Optional[Tuple[float, float]],      # court coords
        opponent_pos_m: Optional[Tuple[float, float]], # opponent court coords
        court_w_m: float = 5.18,
        court_h_m: float = 13.4,
    ) -> ShotQuality:

        exec_score  = self._score_execution(stroke_type, speed_km_h)
        place_score = self._score_placement(stroke_type, landing_m, court_w_m, court_h_m)
        press_score = self._score_pressure(landing_m, opponent_pos_m, court_w_m, court_h_m)

        total = exec_score + place_score + press_score

        grade, explanation = self._grade(total, stroke_type, exec_score, place_score)

        return ShotQuality(
            score=total, grade=grade,
            execution_score=exec_score, placement_score=place_score,
            pressure_score=press_score, stroke_type=stroke_type,
            explanation=explanation
        )

    # ── Private helpers ──────────────────────────────────────────────────

    def _score_execution(self, stroke_type: str, speed: float) -> int:
        """0–40 points based on speed vs stroke norm."""
        norms = self.STROKE_SPEED_NORMS.get(stroke_type,
                    {'min': 40, 'optimal': 100, 'max': 200})
        opt = norms['optimal']
        mn  = norms['min']
        mx  = norms['max']

        if speed < mn:
            ratio = speed / mn
        elif speed <= opt:
            ratio = 0.7 + 0.3 * (speed - mn) / (opt - mn)
        elif speed <= mx:
            ratio = 1.0 - 0.2 * (speed - opt) / (mx - opt)
        else:
            ratio = 0.8  # Overhit but still powerful

        return round(ratio * 40)

    def _score_placement(self, stroke_type: str,
                         landing: Optional[Tuple[float, float]],
                         cw: float, ch: float) -> int:
        """0–40 points based on proximity to ideal zones."""
        if landing is None:
            return 20  # Unknown placement = neutral

        ideal_zones = self.IDEAL_ZONES.get(stroke_type, [(0.5, 0.5)])
        lx_norm = landing[0] / cw
        ly_norm = landing[1] / ch

        best_dist = min(
            math.sqrt((lx_norm - iz[0])**2 + (ly_norm - iz[1])**2)
            for iz in ideal_zones
        )

        # max useful distance ~0.7 (diagonal fraction)
        ratio = max(0, 1 - best_dist / 0.5)
        return round(ratio * 40)

    def _score_pressure(self, landing: Optional[Tuple[float, float]],
                        opponent: Optional[Tuple[float, float]],
                        cw: float, ch: float) -> int:
        """0–20 points. Higher if opponent is far from landing zone."""
        if landing is None or opponent is None:
            return 10  # Neutral

        dist = math.sqrt(
            (landing[0] - opponent[0])**2 +
            (landing[1] - opponent[1])**2
        )
        max_court_dist = math.sqrt(cw**2 + ch**2)  # ~14.4m diagonal
        ratio = min(dist / (max_court_dist * 0.5), 1.0)
        return round(ratio * 20)

    def _grade(self, score: int, stroke_type: str,
               exec_s: int, place_s: int) -> Tuple[str, str]:
        if score >= 80:
            grade = "Excellent"
            note  = f"Outstanding {stroke_type} — elite execution and placement."
        elif score >= 60:
            grade = "Good"
            if place_s < exec_s:
                note = f"Good {stroke_type} power, but placement can be sharper."
            else:
                note = f"Well-placed {stroke_type}. Increase stroke speed for more pressure."
        elif score >= 40:
            grade = "Neutral"
            note  = f"{stroke_type.capitalize()} is functional but not threatening."
        else:
            grade = "Poor"
            if exec_s < 15:
                note = f"Weak {stroke_type} — work on swing technique and power generation."
            else:
                note = f"{stroke_type.capitalize()} was off-target. Focus on directing placement."

        return grade, note