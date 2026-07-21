from __future__ import annotations

from typing import Iterable

import numpy as np


def smooth_points(points: Iterable[dict | None], process_noise: float = 0.05, measurement_noise: float = 12.0) -> list[dict | None]:
    """Constant-velocity Kalman smoother over shuttle detections."""
    result: list[dict | None] = []
    x = np.zeros((4, 1), dtype=float)
    p = np.eye(4) * 500.0
    f = np.array([[1, 0, 1, 0], [0, 1, 0, 1], [0, 0, 1, 0], [0, 0, 0, 1]], dtype=float)
    h = np.array([[1, 0, 0, 0], [0, 1, 0, 0]], dtype=float)
    q = np.eye(4) * process_noise
    r = np.eye(2) * measurement_noise
    initialized = False

    for point in points:
        if not initialized:
            if point is None:
                result.append(None)
                continue
            x[:2, 0] = [point["px"], point["py"]]
            initialized = True
        else:
            x = f @ x
            p = f @ p @ f.T + q

        if point is not None:
            z = np.array([[point["px"]], [point["py"]]], dtype=float)
            y = z - h @ x
            s = h @ p @ h.T + r
            k = p @ h.T @ np.linalg.inv(s)
            x = x + k @ y
            p = (np.eye(4) - k @ h) @ p

        result.append({"frame": len(result), "px": float(x[0, 0]), "py": float(x[1, 0])})
    return result
