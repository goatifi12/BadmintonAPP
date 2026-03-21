import math
from typing import List, Dict, Tuple, Optional


class StrokeClassifier:
    """
    Classify badminton strokes from shuttle trajectory.

    KEY FIX: the old code classified every single frame as a stroke,
    producing hundreds of false counts.  This version first detects
    STROKE EVENTS (frames where the shuttle was just hit) by finding
    local speed peaks, then classifies only those events.

    A stroke event = a frame where speed is locally maximum AND above
    a minimum threshold AND at least MIN_GAP frames away from the
    previous event.  For a 30 fps video this means at most one stroke
    every ~0.27 seconds, which is realistic for fast badminton.
    """

    # ── Speed thresholds (km/h) ──────────────────────────────────────
    SMASH_MIN_SPEED  = 150   # Smashes are fast
    CLEAR_MIN_SPEED  = 80    # Clears are medium-high speed
    DRIVE_MIN_SPEED  = 70    # Drives are medium speed
    DRIVE_MAX_SPEED  = 200
    DROP_MAX_SPEED   = 100   # Drops are slow
    LIFT_MAX_SPEED   = 90    # Lifts are slow-medium
    NET_MAX_SPEED    = 50    # Net shots are very slow
    NET_SPEED_MAX    = 50    # Alias kept for compatibility

    # ── Vertical angle thresholds (degrees) ─────────────────────────
    # We use VERTICAL angle (steepness), not the full directional angle.
    # +90 = straight up, -90 = straight down, 0 = flat/horizontal.
    STEEP_DOWN  = -25   # Steeper than this = going down sharply  (smash/drop)
    STEEP_UP    =  25   # Steeper than this = going up sharply    (clear/lift)
    FLAT_MAX    =  20   # Within ±20° of horizontal = flat        (drive)

    # ── Event detection parameters ───────────────────────────────────
    MIN_STROKE_SPEED = 15    # km/h — ignore speed peaks below this (noise)
    MIN_GAP_FRAMES   = 8     # minimum frames between two stroke events
                             # at 30fps this = ~0.27 s, realistic minimum

    def __init__(self, fps: int = 30, pixels_to_meters: float = 0.015):
        self.fps              = fps
        self.pixels_to_meters = pixels_to_meters

    # ── Public API ───────────────────────────────────────────────────

    def analyze_strokes(
        self,
        positions:   List[Optional[Tuple[float, float]]],
        speeds_km_h: List[float],
        fps:         int = 30,
    ) -> Dict:
        """
        Main entry point called by footwork.py.

        1. Detect stroke events from speed peaks.
        2. Classify each event.
        3. Collect quality metrics only from real events.
        """
        # Detect which frames are actual stroke hits
        event_frames = self._detect_stroke_events(speeds_km_h)

        stroke_counts = {
            'smash': 0, 'clear': 0, 'drop': 0,
            'net': 0, 'drive': 0, 'lift': 0, 'unknown': 0,
        }

        smash_speeds, smash_angles = [], []
        drop_y_positions = []     # pixel Y at lowest point of drop
        clear_y_positions = []    # pixel Y at highest point of clear
        clear_end_y       = []    # pixel Y where clear lands (depth)
        drive_speeds      = []
        lift_angles       = []

        frame_h = self._estimate_frame_height(positions)

        for idx in event_frames:
            if idx >= len(positions) or positions[idx] is None:
                continue
            if idx >= len(speeds_km_h):
                continue

            speed = speeds_km_h[idx]

            # Use a short window AFTER the hit to judge trajectory direction
            v_angle = self._window_vertical_angle(positions, idx, window=5)

            stroke_type = self._classify(speed, v_angle)
            stroke_counts[stroke_type] += 1

            # Collect quality data
            if stroke_type == 'smash':
                smash_speeds.append(speed)
                # Attack angle = how steep the downward trajectory is (positive number)
                smash_angles.append(abs(v_angle))

            elif stroke_type == 'drop':
                # Track the Y positions during this drop to find the lowest the
                # shuttle gets (closest to the net area).
                # Lower Y pixel value = higher in frame = better net clearance.
                window_ys = [
                    positions[j][1]
                    for j in range(idx, min(idx + 20, len(positions)))
                    if positions[j] is not None
                ]
                if window_ys:
                    drop_y_positions.append(min(window_ys))  # min Y = highest point

            elif stroke_type == 'clear':
                # Highest point reached (min Y = highest in frame)
                window_ys = [
                    positions[j][1]
                    for j in range(idx, min(idx + 40, len(positions)))
                    if positions[j] is not None
                ]
                if window_ys:
                    clear_y_positions.append(min(window_ys))
                    clear_end_y.append(max(window_ys))  # end = deepest Y = back of court

            elif stroke_type == 'drive':
                drive_speeds.append(speed)

            elif stroke_type == 'lift':
                lift_angles.append(abs(v_angle))

        # ── Build quality metrics with meaningful values ─────────────
        total_events = max(sum(stroke_counts.values()), 1)

        stroke_quality = {
            'smash': {
                'count':     stroke_counts['smash'],
                'avg_speed': self._avg(smash_speeds),
                'max_speed': round(max(smash_speeds), 1) if smash_speeds else 0,
                # Attack angle: steepness below horizontal (good smash = 30–60°)
                'avg_angle': self._avg(smash_angles),
            },
            'drop': {
                'count': stroke_counts['drop'],
                # Net clearance: how close to the net the shuttle passes.
                # We express this as a % of frame height (0% = top of frame,
                # 100% = bottom).  A tight net drop should clear at ~45–55%
                # of frame height (near the net line).
                # Positive value always — no more negative numbers.
                'net_clearance': self._net_clearance_pct(drop_y_positions, frame_h),
                # Accuracy: % of all shots that were drops (shot variety metric)
                'accuracy': round(stroke_counts['drop'] / total_events * 100, 0),
            },
            'clear': {
                'count': stroke_counts['clear'],
                # Apex: how high the shuttle flew, as % of frame (lower % = higher)
                'avg_apex': self._apex_pct(clear_y_positions, frame_h),
                # Depth: did the clear land deep? Higher % = landed closer to
                # the back of the opponent's court (good clear = >70%)
                'depth_percentage': self._depth_pct(clear_end_y, frame_h),
            },
            'drive': {
                'count':     stroke_counts['drive'],
                'avg_speed': self._avg(drive_speeds),
                'max_speed': round(max(drive_speeds), 1) if drive_speeds else 0,
            },
            'lift': {
                'count':       stroke_counts['lift'],
                'avg_angle':   self._avg(lift_angles),
                'consistency': round(stroke_counts['lift'] / total_events * 100, 0),
            },
        }

        return {
            'stroke_counts':  stroke_counts,
            'stroke_quality': stroke_quality,
        }

    # ── Static methods kept for compatibility with main.py ───────────

    @staticmethod
    def classify_stroke(
        speed_km_h:       float,
        trajectory_angle: float,
        height_change:    float = 0,
    ) -> str:
        """
        Single-frame classification used by main.py's _reclassify_strokes().
        trajectory_angle here is the FULL directional angle from
        compute_trajectory_angle().  We convert it to a vertical angle
        (steepness) before classifying so left/right motion doesn't
        corrupt the result.
        """
        # Convert full directional angle → vertical steepness
        v_angle = StrokeClassifier._directional_to_vertical(trajectory_angle)
        return StrokeClassifier._classify(speed_km_h, v_angle)

    @staticmethod
    def compute_trajectory_angle(
        prev_pos: Optional[Tuple[float, float]],
        curr_pos: Optional[Tuple[float, float]],
    ) -> float:
        """
        Returns the full directional angle in degrees.
        Kept for compatibility; classify_stroke() converts this to a
        vertical angle internally now.
        """
        if prev_pos is None or curr_pos is None:
            return 0
        dx = curr_pos[0] - prev_pos[0]
        dy = curr_pos[1] - prev_pos[1]
        if dx == 0 and dy == 0:
            return 0
        return math.degrees(math.atan2(-dy, dx))  # negate dy: up = positive

    # ── Private helpers ───────────────────────────────────────────────

    @staticmethod
    def _directional_to_vertical(angle_deg: float) -> float:
        """
        Convert a full directional angle (0–360 or -180–180) to a
        vertical steepness angle (-90 to +90).

        Example: angle=168° (shuttle moving left and slightly up)
        → vertical component ≈ sin(168°)*90 ≈ +18° (slightly upward)
        This prevents horizontal smashes being classified as clears.
        """
        rad = math.radians(angle_deg)
        # Vertical component: sin of the angle gives up/down component
        return math.degrees(math.asin(max(-1, min(1, math.sin(rad)))))

    @staticmethod
    def _classify(speed: float, v_angle: float) -> str:
        """
        Classify using VERTICAL angle only (–90 = down, +90 = up, 0 = flat).

        Rules based on real badminton:
          Smash  — fast + steeply downward
          Clear  — medium+ speed + steeply upward (hit from back, travels high)
          Drop   — slow + somewhat downward
          Lift   — slow-medium + steeply upward (hit near net, goes to back)
          Drive  — medium speed + flat
          Net    — very slow + slight downward (delicate net shot)
        """
        C = StrokeClassifier

        # Smash: fast + going steeply down
        if speed > C.SMASH_MIN_SPEED and v_angle < C.STEEP_DOWN:
            return 'smash'

        # Clear: medium+ speed + steeply upward
        if speed > C.CLEAR_MIN_SPEED and v_angle > C.STEEP_UP:
            return 'clear'

        # Lift: slow-medium + steeply upward (defensive, near net)
        if speed < C.LIFT_MAX_SPEED and v_angle > C.STEEP_UP:
            return 'lift'

        # Drive: medium speed + flat trajectory
        if C.DRIVE_MIN_SPEED < speed < C.DRIVE_MAX_SPEED and abs(v_angle) < C.FLAT_MAX:
            return 'drive'

        # Drop: slow + going somewhat downward
        if speed < C.DROP_MAX_SPEED and v_angle < -10:
            return 'drop'

        # Net: very slow + slight downward (barely clearing the net)
        if speed < C.NET_MAX_SPEED and -25 < v_angle < 5:
            return 'net'

        return 'unknown'

    def _detect_stroke_events(self, speeds: List[float]) -> List[int]:
        """
        Find frames where the shuttle was just hit.

        A hit = local speed maximum above MIN_STROKE_SPEED with at
        least MIN_GAP_FRAMES between events.

        Why this works: when a player hits the shuttle, speed jumps
        sharply then decays due to air resistance.  The frame at the
        peak (or just after) is the contact point.
        """
        events    = []
        last_event = -self.MIN_GAP_FRAMES  # allow first event at frame 0

        n = len(speeds)
        for i in range(1, n - 1):
            if speeds[i] < self.MIN_STROKE_SPEED:
                continue
            # Local maximum: faster than both neighbours
            if speeds[i] >= speeds[i - 1] and speeds[i] >= speeds[i + 1]:
                if i - last_event >= self.MIN_GAP_FRAMES:
                    events.append(i)
                    last_event = i

        return events

    def _window_vertical_angle(
        self,
        positions: List[Optional[Tuple[float, float]]],
        start:     int,
        window:    int = 5,
    ) -> float:
        """
        Calculate the overall vertical direction over the next `window`
        frames after a stroke event.  Using a window smooths out
        single-frame jitter and gives a more reliable classification.
        """
        end = min(start + window, len(positions))
        valid = [positions[j] for j in range(start, end) if positions[j] is not None]

        if len(valid) < 2:
            return 0

        dx = valid[-1][0] - valid[0][0]
        dy = valid[-1][1] - valid[0][1]  # positive = moving DOWN in frame

        if abs(dx) < 0.1 and abs(dy) < 0.1:
            return 0

        # Vertical angle: positive = upward, negative = downward
        # dy in image coords is inverted so we negate
        hyp = math.sqrt(dx * dx + dy * dy)
        return math.degrees(math.asin(max(-1, min(1, -dy / hyp))))

    @staticmethod
    def _estimate_frame_height(
        positions: List[Optional[Tuple[float, float]]]
    ) -> float:
        """Estimate frame height from the range of Y positions seen."""
        ys = [p[1] for p in positions if p is not None]
        if not ys:
            return 480.0
        span = max(ys) - min(ys)
        # Add a small buffer: the shuttle doesn't usually reach the very
        # edge of the frame so the real frame is a bit taller than the range
        return max(span * 1.3, 240.0)

    @staticmethod
    def _net_clearance_pct(
        drop_y_min: List[float],
        frame_h:    float,
    ) -> float:
        """
        Net clearance for drops.

        Expressed as % of frame height where the shuttle was at its
        highest point during the drop.  50% = mid-frame = near net
        height.  A good tight drop = 40–60%.  Always positive.
        """
        if not drop_y_min:
            return 0.0
        avg_min_y = sum(drop_y_min) / len(drop_y_min)
        pct = round((avg_min_y / max(frame_h, 1)) * 100, 1)
        return max(0.0, pct)  # clamp to 0 — no negatives

    @staticmethod
    def _apex_pct(
        clear_y_min: List[float],
        frame_h:     float,
    ) -> float:
        """
        Apex height for clears.

        Expressed as % of frame height where the shuttle was at its
        highest point.  Lower % = higher shuttle = better clear arc.
        A good attacking clear = 20–40%.
        """
        if not clear_y_min:
            return 0.0
        avg_min_y = sum(clear_y_min) / len(clear_y_min)
        pct = round((avg_min_y / max(frame_h, 1)) * 100, 1)
        return max(0.0, pct)

    @staticmethod
    def _depth_pct(
        clear_end_y: List[float],
        frame_h:     float,
    ) -> float:
        """
        Depth score for clears.

        What % of the frame height the shuttle reached when it landed.
        Higher % = landed deeper/further into opponent's court.
        A good deep clear = >70%.
        """
        if not clear_end_y:
            return 0.0
        avg_end_y = sum(clear_end_y) / len(clear_end_y)
        pct = round((avg_end_y / max(frame_h, 1)) * 100, 1)
        return max(0.0, min(100.0, pct))

    @staticmethod
    def _avg(values: List[float]) -> float:
        if not values:
            return 0.0
        return round(sum(values) / len(values), 1)