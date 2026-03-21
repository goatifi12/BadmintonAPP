"""
Kalman filter for shuttle trajectory smoothing.
State vector: [x, y, vx, vy] — position + velocity.
"""
import numpy as np
from typing import List, Optional, Tuple

class KalmanShuttleSmoother:
    """
    Constant-velocity Kalman filter for shuttle tracking.
    Handles occlusions up to ~20 frames.
    """

    def __init__(self, fps: int = 30, process_noise: float = 5.0,
                 measurement_noise: float = 10.0):
        self.fps = fps
        dt = 1.0 / fps

        # State transition: [x, y, vx, vy]
        self.F = np.array([
            [1, 0, dt, 0],
            [0, 1, 0, dt],
            [0, 0, 1,  0],
            [0, 0, 0,  1]
        ], dtype=float)

        # Measurement: observe x, y only
        self.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ], dtype=float)

        self.Q = np.eye(4) * process_noise     # Process noise
        self.R = np.eye(2) * measurement_noise  # Measurement noise

        self._state: Optional[np.ndarray] = None
        self._cov: Optional[np.ndarray] = None

    def reset(self):
        self._state = None
        self._cov = None

    def update(self, measurement: Optional[Tuple[float, float]]) -> Tuple[float, float]:
        """
        Returns smoothed (x, y) given current measurement (or None if occluded).
        """
        if self._state is None:
            if measurement is None:
                return (0.0, 0.0)
            self._state = np.array([measurement[0], measurement[1], 0.0, 0.0])
            self._cov   = np.eye(4) * 100
            return measurement

        # Predict
        x_pred = self.F @ self._state
        P_pred = self.F @ self._cov @ self.F.T + self.Q

        if measurement is not None:
            z = np.array([measurement[0], measurement[1]])
            # Kalman gain
            S = self.H @ P_pred @ self.H.T + self.R
            K = P_pred @ self.H.T @ np.linalg.inv(S)
            # Update
            self._state = x_pred + K @ (z - self.H @ x_pred)
            self._cov   = (np.eye(4) - K @ self.H) @ P_pred
        else:
            # Occlusion: propagate prediction only
            self._state = x_pred
            self._cov   = P_pred

        return (float(self._state[0]), float(self._state[1]))

    def smooth_trajectory(self, raw_detections: List[dict]) -> List[dict]:
        """
        Apply Kalman smoothing to full detection sequence.
        Input: list of {0: [x1,y1,x2,y2]} or {}
        Output: same format with smoothed coordinates
        """
        self.reset()
        smoothed = []

        for det in raw_detections:
            if 0 in det and det[0] is not None:
                x1,y1,x2,y2 = det[0]
                cx, cy = (x1+x2)/2, (y1+y2)/2
                sx, sy = self.update((cx, cy))
                # Reconstruct bbox around smoothed center
                w, h = x2-x1, y2-y1
                smoothed.append({0: [sx-w/2, sy-h/2, sx+w/2, sy+h/2]})
            else:
                sx, sy = self.update(None)
                # Only propagate if filter is initialized
                if self._state is not None:
                    w, h = 15, 15  # Estimated shuttle bbox
                    smoothed.append({0: [sx-w/2, sy-h/2, sx+w/2, sy+h/2]})
                else:
                    smoothed.append({})

        return smoothed