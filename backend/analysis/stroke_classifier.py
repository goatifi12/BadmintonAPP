"""
stroke_classifier.py  —  Pro-Level Badminton Stroke Classification

Based on the professional shot-detection framework:

CORE INSIGHT: classify at STROKE EVENTS (speed peaks), not every frame.
Each event is classified using a FEATURE VECTOR that includes:
  - contact position (where the shuttle was when hit)
  - landing position  (where the segment ends)
  - speed at hit and speed decay
  - trajectory angle and curvature
  - net crossing height (most informative single feature)

SHOT DEFINITIONS used (matching your descriptions):
  Smash  — back half of court, steep downward, fast
  Clear  — back half, high arc, lands opponent back court
  Drop   — high contact, slow, lands near net (frontcourt)
  Net    — near net, very slow, lands within ~1m of net
  Drive  — mid-court, flat, medium speed
  Lift   — near net, high upward arc, lands opponent back court
"""
import math
from typing import List, Dict, Tuple, Optional


# ── Court zone constants (normalised 0–1, y=0 = near side, y=1 = far side) ──
FRONTCOURT_Y  = 0.35   # anything below this = near net
BACKCOURT_Y   = 0.65   # anything above this = deep court
NET_ZONE_Y    = 0.45   # ±10% around centre = net area


class StrokeClassifier:
    """
    Classify badminton strokes from shuttle trajectory.
    Designed to be called via analyze_strokes() (batch) or
    classify_stroke() (single frame, for compatibility).
    """

    # ── Speed thresholds (km/h) ─────────────────────────────────────
    SMASH_MIN_SPEED   = 120   # smashes start at ~120 km/h
    CLEAR_MIN_SPEED   = 70
    DRIVE_MIN_SPEED   = 60
    DRIVE_MAX_SPEED   = 200
    DROP_MAX_SPEED    = 110
    LIFT_MAX_SPEED    = 100
    NET_MAX_SPEED     = 55
    NET_SPEED_MAX     = 55    # alias

    # ── Vertical angle thresholds (°, +up / -down) ──────────────────
    STEEP_DOWN = -20
    STEEP_UP   =  20
    FLAT_MAX   =  20

    # ── Event detection ──────────────────────────────────────────────
    MIN_STROKE_SPEED  = 12    # km/h — ignore slower peaks (noise)
    MIN_GAP_FRAMES    = 7     # min frames between events (~0.23 s at 30 fps)

    def __init__(self, fps: int = 30, pixels_to_meters: float = 0.015):
        self.fps              = fps
        self.pixels_to_meters = pixels_to_meters

    # ════════════════════════════════════════════════════════════════
    # PUBLIC API
    # ════════════════════════════════════════════════════════════════

    def analyze_strokes(
        self,
        positions:   List[Optional[Tuple[float, float]]],
        speeds_km_h: List[float],
        fps:         int = 30,
    ) -> Dict:
        """
        Main entry point called by footwork.py.
        Returns stroke_counts and stroke_quality dicts.
        """
        frame_h = self._estimate_frame_height(positions)
        frame_w = self._estimate_frame_width(positions)

        event_frames = self._detect_stroke_events(speeds_km_h)

        stroke_counts = {k: 0 for k in
                         ['smash','clear','drop','net','drive','lift','unknown']}

        # Quality collectors
        smash_speeds, smash_angles         = [], []
        drop_contact_y, drop_land_y        = [], []
        clear_apex_y,   clear_land_y       = [], []
        drive_speeds                        = []
        lift_contact_y, lift_land_y         = [], []

        for idx in event_frames:
            if idx >= len(positions) or positions[idx] is None:
                continue
            speed = speeds_km_h[idx] if idx < len(speeds_km_h) else 0

            contact_pos = positions[idx]
            land_pos    = self._find_landing(positions, idx)

            # Normalise positions to 0-1 court fractions
            contact_yn  = contact_pos[1] / frame_h if frame_h > 0 else 0.5
            land_yn     = land_pos[1]    / frame_h if land_pos and frame_h > 0 else None

            # Trajectory angle over next few frames
            v_angle = self._window_vertical_angle(positions, idx, window=6)

            stroke = self._classify_event(
                speed, v_angle, contact_yn, land_yn
            )
            stroke_counts[stroke] += 1

            # Collect quality data
            if stroke == 'smash':
                smash_speeds.append(speed)
                smash_angles.append(abs(v_angle))
            elif stroke == 'drop':
                drop_contact_y.append(contact_yn)
                if land_yn is not None: drop_land_y.append(land_yn)
            elif stroke == 'clear':
                apex_yn = self._find_apex(positions, idx, frame_h)
                if apex_yn is not None: clear_apex_y.append(apex_yn)
                if land_yn is not None: clear_land_y.append(land_yn)
            elif stroke == 'drive':
                drive_speeds.append(speed)
            elif stroke == 'lift':
                lift_contact_y.append(contact_yn)
                if land_yn is not None: lift_land_y.append(land_yn)

        total = max(sum(stroke_counts.values()), 1)

        stroke_quality = {
            'smash': {
                'count':     stroke_counts['smash'],
                'avg_speed': self._avg(smash_speeds),
                'max_speed': round(max(smash_speeds), 1) if smash_speeds else 0,
                # Steepness below horizontal — 30–60° is a strong smash
                'avg_angle': self._avg(smash_angles),
            },
            'drop': {
                'count': stroke_counts['drop'],
                # How tight to the net the drop lands: lower % = tighter
                'net_clearance': self._drop_net_clearance(drop_land_y),
                'accuracy': round(stroke_counts['drop'] / total * 100, 0),
            },
            'clear': {
                'count': stroke_counts['clear'],
                # Apex: how high the shuttle flew (lower % = higher)
                'avg_apex': self._apex_pct(clear_apex_y),
                # Depth: did it land deep? Higher % = better clear
                'depth_percentage': self._depth_pct(clear_land_y),
            },
            'drive': {
                'count':     stroke_counts['drive'],
                'avg_speed': self._avg(drive_speeds),
                'max_speed': round(max(drive_speeds), 1) if drive_speeds else 0,
            },
            'lift': {
                'count':       stroke_counts['lift'],
                # Consistency: what % of lifts reached deep court
                'avg_angle':   self._avg([abs(self._window_vertical_angle(
                                   [], 0)) for _ in lift_land_y]),
                'consistency': self._lift_consistency(lift_land_y),
            },
        }

        return {'stroke_counts': stroke_counts, 'stroke_quality': stroke_quality}

    # ── Single-frame classification (used by main.py _reclassify_strokes) ──
    @staticmethod
    def classify_stroke(
        speed_km_h:       float,
        trajectory_angle: float,
        height_change:    float = 0,
    ) -> str:
        """
        Compatibility method.  trajectory_angle here is the full
        directional angle from compute_trajectory_angle().
        We convert to vertical steepness before classifying.
        """
        v = StrokeClassifier._directional_to_vertical(trajectory_angle)
        return StrokeClassifier._classify_simple(speed_km_h, v)

    @staticmethod
    def compute_trajectory_angle(
        prev_pos: Optional[Tuple[float, float]],
        curr_pos: Optional[Tuple[float, float]],
    ) -> float:
        if prev_pos is None or curr_pos is None:
            return 0.0
        dx = curr_pos[0] - prev_pos[0]
        dy = curr_pos[1] - prev_pos[1]
        if abs(dx) < 0.01 and abs(dy) < 0.01:
            return 0.0
        return math.degrees(math.atan2(-dy, dx))  # negate dy: up = +

    # ════════════════════════════════════════════════════════════════
    # CORE CLASSIFICATION WITH LANDING ZONES
    # ════════════════════════════════════════════════════════════════

    def _classify_event(
        self,
        speed:      float,
        v_angle:    float,  # vertical steepness: + = up, - = down
        contact_yn: float,  # contact Y as 0-1 fraction of frame (0 = top)
        land_yn:    Optional[float],  # landing Y as 0-1 fraction
    ) -> str:
        """
        Pro-level classification using position context.

        Court orientation: y=0 = top of frame (far court), y=1 = bottom (near court)
        contact_yn > 0.5 = player is in their own back half = can smash/clear
        land_yn < 0.35  = lands near net (frontcourt)
        land_yn > 0.65  = lands deep (backcourt)
        """
        C = StrokeClassifier

        # ── 1. SMASH ────────────────────────────────────────────────
        # Fast + steep down + contacted from back half of court
        if (speed > C.SMASH_MIN_SPEED
                and v_angle < C.STEEP_DOWN
                and contact_yn > 0.45):
            return 'smash'

        # ── 2. NET SHOT ─────────────────────────────────────────────
        # Very slow + near net contact + lands near net
        if speed < C.NET_MAX_SPEED:
            if land_yn is not None and land_yn < FRONTCOURT_Y + 0.1:
                return 'net'
            # Even without landing data, if very slow classify as net
            if speed < 35 and abs(v_angle) < 25:
                return 'net'

        # ── 3. LIFT ─────────────────────────────────────────────────
        # Near net + high upward arc → lands deep
        # Player is near net (top of frame = opponent side means
        # contact_yn is LOW for near-net shots)
        if (speed < C.LIFT_MAX_SPEED
                and v_angle > C.STEEP_UP
                and contact_yn < 0.45):   # contacted near net
            if land_yn is None or land_yn > BACKCOURT_Y:
                return 'lift'

        # ── 4. CLEAR ────────────────────────────────────────────────
        # Medium+ speed + steeply upward + contacted from back half
        # + lands deep in opponent's court
        if (speed > C.CLEAR_MIN_SPEED
                and v_angle > C.STEEP_UP
                and contact_yn > 0.45):
            return 'clear'

        # ── 5. DROP ─────────────────────────────────────────────────
        # Slow-medium + downward + lands near net
        if speed < C.DROP_MAX_SPEED and v_angle < -8:
            if land_yn is None or land_yn < FRONTCOURT_Y + 0.15:
                return 'drop'

        # ── 6. DRIVE ────────────────────────────────────────────────
        # Medium speed + flat trajectory
        if (C.DRIVE_MIN_SPEED < speed < C.DRIVE_MAX_SPEED
                and abs(v_angle) < C.FLAT_MAX):
            return 'drive'

        # ── 7. Slower flat shots → net or drive ─────────────────────
        if speed < C.NET_MAX_SPEED and abs(v_angle) < 30:
            return 'net'

        return 'unknown'

    @staticmethod
    def _classify_simple(speed: float, v_angle: float) -> str:
        """
        Simplified version used by single-frame classify_stroke()
        when landing position is unknown.
        """
        C = StrokeClassifier
        if speed > C.SMASH_MIN_SPEED   and v_angle < C.STEEP_DOWN:  return 'smash'
        if speed > C.CLEAR_MIN_SPEED   and v_angle > C.STEEP_UP:    return 'clear'
        if speed < C.LIFT_MAX_SPEED    and v_angle > C.STEEP_UP:    return 'lift'
        if speed < C.DROP_MAX_SPEED    and v_angle < -8:             return 'drop'
        if speed < C.NET_MAX_SPEED     and abs(v_angle) < 30:        return 'net'
        if C.DRIVE_MIN_SPEED < speed   and abs(v_angle) < C.FLAT_MAX: return 'drive'
        return 'unknown'

    # ════════════════════════════════════════════════════════════════
    # EVENT DETECTION
    # ════════════════════════════════════════════════════════════════

    def _detect_stroke_events(self, speeds: List[float]) -> List[int]:
        """
        Find frames where the shuttle was just hit = local speed peaks.
        Returns at most one event per MIN_GAP_FRAMES window.
        """
        events     = []
        last_event = -self.MIN_GAP_FRAMES
        n          = len(speeds)

        for i in range(1, n - 1):
            if speeds[i] < self.MIN_STROKE_SPEED:
                continue
            is_peak = (speeds[i] >= speeds[i - 1] and speeds[i] >= speeds[i + 1])
            if is_peak and (i - last_event) >= self.MIN_GAP_FRAMES:
                events.append(i)
                last_event = i

        return events

    # ════════════════════════════════════════════════════════════════
    # TRAJECTORY HELPERS
    # ════════════════════════════════════════════════════════════════

    def _window_vertical_angle(
        self,
        positions: List[Optional[Tuple[float, float]]],
        start:     int,
        window:    int = 6,
    ) -> float:
        """
        Vertical angle over the next `window` frames after the hit.
        Using a window avoids single-frame noise.
        """
        end   = min(start + window, len(positions))
        valid = [positions[j] for j in range(start, end) if j < len(positions) and positions[j]]
        if len(valid) < 2:
            return 0.0
        dx  = valid[-1][0] - valid[0][0]
        dy  = valid[-1][1] - valid[0][1]
        hyp = math.sqrt(dx * dx + dy * dy)
        if hyp < 0.1:
            return 0.0
        # Negate dy because image Y increases downward
        return math.degrees(math.asin(max(-1.0, min(1.0, -dy / hyp))))

    def _find_landing(
        self,
        positions: List[Optional[Tuple[float, float]]],
        start:     int,
        max_look:  int = 45,
    ) -> Optional[Tuple[float, float]]:
        """
        Find where the shuttle stopped or reversed direction after the hit.
        That is the landing/opponent-hit position.
        """
        end = min(start + max_look, len(positions))
        prev_y = None
        for i in range(start + 2, end):
            if positions[i] is None:
                continue
            cy = positions[i][1]
            if prev_y is not None:
                # Shuttle stopped falling (started rising) = hit or landed
                if cy < prev_y - 2:     # moving UP (getting smaller Y)
                    return positions[i]
            prev_y = cy
        # Return last valid position in the window
        for i in range(end - 1, start, -1):
            if i < len(positions) and positions[i]:
                return positions[i]
        return None

    def _find_apex(
        self,
        positions: List[Optional[Tuple[float, float]]],
        start:     int,
        frame_h:   float,
        max_look:  int = 60,
    ) -> Optional[float]:
        """Find the highest Y reached (minimum Y pixel = top of arc)."""
        end    = min(start + max_look, len(positions))
        min_y  = None
        for i in range(start, end):
            if i < len(positions) and positions[i]:
                y = positions[i][1]
                if min_y is None or y < min_y:
                    min_y = y
        if min_y is None or frame_h <= 0:
            return None
        return min_y / frame_h   # 0-1 fraction

    # ════════════════════════════════════════════════════════════════
    # QUALITY METRIC HELPERS
    # ════════════════════════════════════════════════════════════════

    @staticmethod
    def _drop_net_clearance(land_yn_list: List[float]) -> float:
        """
        Net clearance for drops.
        Expressed as % of court depth where the drop lands.
        Good tight drop = 20–35% (near the net end).
        Always 0–100, never negative.
        """
        if not land_yn_list:
            return 0.0
        avg = sum(land_yn_list) / len(land_yn_list)
        # Convert to % of court: 0 = top of frame, 100 = bottom
        return max(0.0, round(avg * 100, 1))

    @staticmethod
    def _apex_pct(apex_yn_list: List[float]) -> float:
        """
        Apex height as % of frame.  Lower = higher shuttle = better clear arc.
        Typical good clear: 15–35%.
        """
        if not apex_yn_list:
            return 0.0
        return max(0.0, round(sum(apex_yn_list) / len(apex_yn_list) * 100, 1))

    @staticmethod
    def _depth_pct(land_yn_list: List[float]) -> float:
        """
        Clear depth: % of court where the clear lands.
        Higher = deeper = better. Good clear: >70%.
        """
        if not land_yn_list:
            return 0.0
        return round(min(100.0,
               max(0.0, sum(land_yn_list) / len(land_yn_list) * 100)), 1)

    @staticmethod
    def _lift_consistency(lift_land_yn: List[float]) -> float:
        """% of lifts that actually reached deep court (y > 0.65)."""
        if not lift_land_yn:
            return 0.0
        deep = sum(1 for y in lift_land_yn if y > BACKCOURT_Y)
        return round(deep / len(lift_land_yn) * 100, 0)

    @staticmethod
    def _estimate_frame_height(positions):
        ys = [p[1] for p in positions if p]
        return max(max(ys) * 1.1, 240.0) if ys else 480.0

    @staticmethod
    def _estimate_frame_width(positions):
        xs = [p[0] for p in positions if p]
        return max(max(xs) * 1.1, 320.0) if xs else 640.0

    @staticmethod
    def _avg(values):
        return round(sum(values) / len(values), 1) if values else 0.0

    @staticmethod
    def _directional_to_vertical(angle_deg: float) -> float:
        """Convert full directional angle to vertical steepness -90..+90."""
        return math.degrees(math.asin(
            max(-1.0, min(1.0, math.sin(math.radians(angle_deg))))
        ))