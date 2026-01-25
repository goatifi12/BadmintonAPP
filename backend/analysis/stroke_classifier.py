class StrokeClassifier:
    """Infer stroke types from shuttle trajectory"""
    
    SMASH_SPEED_THRESHOLD = 200  # km/h
    DROP_SPEED_THRESHOLD = 80    # km/h
    
    @staticmethod
    def classify_stroke(speed_km_h: float, trajectory_angle: float) -> str:
        """
        Classify stroke based on speed and angle
        
        Returns: 'smash', 'clear', 'drop', 'drive', 'unknown'
        """
        if speed_km_h > StrokeClassifier.SMASH_SPEED_THRESHOLD:
            return 'smash'
        elif speed_km_h < StrokeClassifier.DROP_SPEED_THRESHOLD and trajectory_angle < -30:
            return 'drop'
        elif speed_km_h < StrokeClassifier.DROP_SPEED_THRESHOLD and trajectory_angle > 30:
            return 'clear'
        elif 80 < speed_km_h < 200 and abs(trajectory_angle) < 15:
            return 'drive'
        else:
            return 'unknown'
    
    @staticmethod
    def compute_trajectory_angle(prev_pos, curr_pos):
        """Compute angle of shuttle trajectory"""
        if prev_pos is None or curr_pos is None:
            return 0
        
        dx = curr_pos[0] - prev_pos[0]
        dy = curr_pos[1] - prev_pos[1]
        
        import math
        angle = math.degrees(math.atan2(dy, dx))
        return angle