"""
Stroke Classifier - Analyzes shuttle trajectory to classify badminton strokes
"""
import math
from typing import List, Dict, Optional, Tuple

class StrokeClassifier:
    """Classify badminton strokes from shuttle trajectory data"""
    
    # Speed thresholds (km/h)
    SMASH_MIN_SPEED = 200
    DROP_MAX_SPEED = 100
    NET_MAX_SPEED = 60
    CLEAR_MIN_SPEED = 120
    
    # Angle thresholds (degrees)
    STEEP_DOWN_ANGLE = -35  # Downward trajectory
    STEEP_UP_ANGLE = 35     # Upward trajectory
    FLAT_ANGLE_MAX = 20     # Near horizontal
    
    def __init__(self, fps=30, pixels_to_meters=0.02):
        """
        Args:
            fps: Video frame rate
            pixels_to_meters: Conversion factor for court scaling
        """
        self.fps = fps
        self.pixels_to_meters = pixels_to_meters
        
    def analyze_strokes(self, detections: List[Dict]) -> Dict:
        """
        Analyze all strokes in a video
        
        Args:
            detections: List of frame detections [{0: [x1, y1, x2, y2]}, ...]
            
        Returns:
            Dict with stroke counts and quality metrics
        """
        # Extract positions
        positions = self._extract_positions(detections)
        
        # Find stroke events (rapid speed changes indicate hits)
        stroke_events = self._detect_stroke_events(positions)
        
        # Classify each stroke
        stroke_data = []
        for event_idx in stroke_events:
            stroke_info = self._classify_single_stroke(positions, event_idx)
            if stroke_info:
                stroke_data.append(stroke_info)
        
        # Aggregate statistics
        return self._aggregate_stroke_stats(stroke_data)
    
    def _extract_positions(self, detections: List[Dict]) -> List[Optional[Tuple[float, float]]]:
        """Extract center positions from detections"""
        positions = []
        for frame_det in detections:
            if 0 in frame_det:
                x1, y1, x2, y2 = frame_det[0]
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2
                positions.append((cx, cy))
            else:
                positions.append(None)
        return positions
    
    def _detect_stroke_events(self, positions: List[Optional[Tuple]]) -> List[int]:
        """
        Detect stroke events by finding rapid acceleration points
        (speed increases indicate player hitting shuttle)
        """
        speeds = []
        for i in range(1, len(positions)):
            if positions[i] and positions[i-1]:
                dx = positions[i][0] - positions[i-1][0]
                dy = positions[i][1] - positions[i-1][1]
                speed = math.sqrt(dx*dx + dy*dy)
                speeds.append((i, speed))
            else:
                speeds.append((i, 0))
        
        # Find local maxima (peaks in speed = strokes)
        stroke_indices = []
        window = 5  # frames
        
        for i in range(window, len(speeds) - window):
            current_speed = speeds[i][1]
            if current_speed < 5:  # Skip very slow movements
                continue
                
            # Check if this is a local maximum
            is_peak = all(
                current_speed > speeds[j][1] 
                for j in range(i - window, i + window) 
                if j != i
            )
            
            if is_peak:
                stroke_indices.append(speeds[i][0])
        
        return stroke_indices
    
    def _classify_single_stroke(
        self, 
        positions: List[Optional[Tuple]], 
        event_idx: int
    ) -> Optional[Dict]:
        """
        Classify a single stroke based on trajectory around the event
        
        Returns:
            Dict with stroke_type, speed, angle, etc.
        """
        # Need positions before and after stroke
        if event_idx < 3 or event_idx >= len(positions) - 3:
            return None
            
        # Get pre-stroke and post-stroke positions
        pre_pos = positions[event_idx - 2]
        event_pos = positions[event_idx]
        post_pos = positions[event_idx + 2]
        
        if not (pre_pos and event_pos and post_pos):
            return None
        
        # Calculate speed at impact (km/h)
        dx = event_pos[0] - pre_pos[0]
        dy = event_pos[1] - pre_pos[1]
        pixel_dist = math.sqrt(dx*dx + dy*dy)
        
        meters_per_frame = pixel_dist * self.pixels_to_meters
        meters_per_second = meters_per_frame * self.fps
        speed_km_h = meters_per_second * 3.6
        
        # Calculate trajectory angle (post-stroke)
        dx_post = post_pos[0] - event_pos[0]
        dy_post = post_pos[1] - event_pos[1]
        angle = math.degrees(math.atan2(dy_post, dx_post))
        
        # Calculate attack angle (negative dy = downward)
        dy_change = post_pos[1] - pre_pos[1]
        attack_angle = math.degrees(math.atan2(-dy_change, abs(dx_post)))
        
        # Classify stroke type
        stroke_type = self._classify_by_rules(speed_km_h, angle, attack_angle)
        
        return {
            "type": stroke_type,
            "speed_km_h": speed_km_h,
            "trajectory_angle": angle,
            "attack_angle": attack_angle,
            "frame": event_idx
        }
    
    def _classify_by_rules(
        self, 
        speed: float, 
        trajectory_angle: float, 
        attack_angle: float
    ) -> str:
        """
        Rule-based stroke classification
        
        Returns: 'smash', 'clear', 'drop', 'net', 'drive'
        """
        # SMASH: High speed + steep downward angle
        if speed > self.SMASH_MIN_SPEED and attack_angle > 25:
            return 'smash'
        
        # DROP: Low speed + steep downward angle
        if speed < self.DROP_MAX_SPEED and attack_angle > 20:
            return 'drop'
        
        # NET: Very low speed + downward
        if speed < self.NET_MAX_SPEED and attack_angle > 15:
            return 'net'
        
        # CLEAR: High speed + upward trajectory
        if speed > self.CLEAR_MIN_SPEED and trajectory_angle < self.STEEP_DOWN_ANGLE:
            return 'clear'
        
        # DRIVE: Medium speed + flat trajectory
        if 100 < speed < 200 and abs(trajectory_angle) < self.FLAT_ANGLE_MAX:
            return 'drive'
        
        # Default to clear if high and upward, otherwise unknown
        if trajectory_angle < 0:
            return 'clear'
        
        return 'drive'
    
    def _aggregate_stroke_stats(self, stroke_data: List[Dict]) -> Dict:
        """
        Aggregate individual strokes into summary statistics
        
        Returns:
            Dict matching frontend expected format
        """
        if not stroke_data:
            return self._empty_stats()
        
        # Count strokes by type
        counts = {'smash': 0, 'clear': 0, 'drop': 0, 'net': 0, 'drive': 0}
        for stroke in stroke_data:
            stroke_type = stroke['type']
            if stroke_type in counts:
                counts[stroke_type] += 1
        
        # Smash quality metrics
        smashes = [s for s in stroke_data if s['type'] == 'smash']
        smash_quality = {
            "avg_speed": sum(s['speed_km_h'] for s in smashes) / len(smashes) if smashes else 0,
            "max_speed": max((s['speed_km_h'] for s in smashes), default=0),
            "avg_angle": sum(s['attack_angle'] for s in smashes) / len(smashes) if smashes else 0
        }
        
        # Drop quality metrics
        drops = [s for s in stroke_data if s['type'] == 'drop']
        drop_quality = {
            "net_clearance": 45 if drops else 0,  # Placeholder - need court detection
            "accuracy": min(100, len(drops) * 5) if drops else 0  # Rough estimate
        }
        
        # Clear quality metrics
        clears = [s for s in stroke_data if s['type'] == 'clear']
        clear_quality = {
            "avg_apex": 5.5,  # Placeholder - need trajectory tracking
            "depth_percentage": 75 if clears else 0
        }
        
        return {
            "stroke_counts": {
                "smash": counts['smash'],
                "clear": counts['clear'],
                "drop": counts['drop'],
                "net": counts['net']
            },
            "stroke_quality": {
                "smash": smash_quality,
                "drop": drop_quality,
                "clear": clear_quality
            },
            "total_strokes": len(stroke_data)
        }
    
    def _empty_stats(self) -> Dict:
        """Return empty stats when no strokes detected"""
        return {
            "stroke_counts": {
                "smash": 0,
                "clear": 0,
                "drop": 0,
                "net": 0
            },
            "stroke_quality": {
                "smash": {"avg_speed": 0, "max_speed": 0, "avg_angle": 0},
                "drop": {"net_clearance": 0, "accuracy": 0},
                "clear": {"avg_apex": 0, "depth_percentage": 0}
            },
            "total_strokes": 0
        }