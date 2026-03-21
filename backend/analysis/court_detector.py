"""
Court detection via homography.
Maps pixel coords → real-world court coordinates (meters).
Standard singles court: 13.4m × 5.18m
"""
import cv2
import numpy as np
from dataclasses import dataclass
from typing import Optional, Tuple

@dataclass
class CourtHomography:
    matrix: np.ndarray          # 3×3 homography: pixel → court meters
    inverse_matrix: np.ndarray  # court meters → pixel
    court_mask: np.ndarray      # binary mask of court area
    confidence: float           # 0–1 detection confidence
    corners_px: np.ndarray      # 4 pixel corners (TL, TR, BR, BL)

    # Real-world reference (standard singles court)
    COURT_W_M = 5.18
    COURT_H_M = 13.4

class CourtDetector:
    """
    Detects badminton court boundaries using line detection
    and fits homography to standard court dimensions.
    """

    def __init__(self):
        self.homography: Optional[CourtHomography] = None

    def detect(self, frame: np.ndarray) -> CourtHomography:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150, apertureSize=3)

        lines = cv2.HoughLinesP(
            edges, rho=1, theta=np.pi/180,
            threshold=80, minLineLength=100, maxLineGap=20
        )

        if lines is None or len(lines) < 4:
            return self._fallback_homography(frame.shape)

        corners = self._find_court_corners(lines, frame.shape)
        if corners is None:
            return self._fallback_homography(frame.shape)

        # Real-world court corners (meters, origin = top-left)
        W, H = CourtHomography.COURT_W_M, CourtHomography.COURT_H_M
        real_corners = np.float32([
            [0, 0], [W, 0], [W, H], [0, H]
        ])

        M, _ = cv2.findHomography(corners, real_corners, cv2.RANSAC, 5.0)
        M_inv, _ = cv2.findHomography(real_corners, corners, cv2.RANSAC, 5.0)

        mask = np.zeros(frame.shape[:2], dtype=np.uint8)
        cv2.fillPoly(mask, [corners.astype(np.int32)], 255)

        self.homography = CourtHomography(
            matrix=M, inverse_matrix=M_inv,
            court_mask=mask, confidence=0.85,
            corners_px=corners
        )
        return self.homography

    def pixel_to_court(self, px: float, py: float) -> Tuple[float, float]:
        """Convert pixel coordinate to court meters."""
        if self.homography is None:
            raise RuntimeError("Court not detected yet")
        pt = np.float32([[[px, py]]])
        result = cv2.perspectiveTransform(pt, self.homography.matrix)
        return float(result[0][0][0]), float(result[0][0][1])

    def court_to_pixel(self, mx: float, my: float) -> Tuple[float, float]:
        """Convert court meters to pixel."""
        if self.homography is None:
            raise RuntimeError("Court not detected yet")
        pt = np.float32([[[mx, my]]])
        result = cv2.perspectiveTransform(pt, self.homography.inverse_matrix)
        return float(result[0][0][0]), float(result[0][0][1])

    def _find_court_corners(self, lines, shape) -> Optional[np.ndarray]:
        h, w = shape[:2]
        horizontal, vertical = [], []

        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.degrees(np.arctan2(abs(y2-y1), abs(x2-x1)))
            if angle < 20:
                horizontal.append((y1+y2)/2)
            elif angle > 70:
                vertical.append((x1+x2)/2)

        if len(horizontal) < 2 or len(vertical) < 2:
            return None

        horizontal.sort()
        vertical.sort()

        top_y    = horizontal[0]
        bottom_y = horizontal[-1]
        left_x   = vertical[0]
        right_x  = vertical[-1]

        if (bottom_y - top_y) < h * 0.3 or (right_x - left_x) < w * 0.3:
            return None

        return np.float32([
            [left_x, top_y], [right_x, top_y],
            [right_x, bottom_y], [left_x, bottom_y]
        ])

    def _fallback_homography(self, shape) -> CourtHomography:
        h, w = shape[:2]
        # Assume court occupies center 60% of frame
        margin_x, margin_y = int(w * 0.2), int(h * 0.1)
        corners = np.float32([
            [margin_x, margin_y], [w-margin_x, margin_y],
            [w-margin_x, h-margin_y], [margin_x, h-margin_y]
        ])
        W, H = CourtHomography.COURT_W_M, CourtHomography.COURT_H_M
        real_corners = np.float32([[0,0],[W,0],[W,H],[0,H]])
        M, _   = cv2.findHomography(corners, real_corners)
        M_inv, _ = cv2.findHomography(real_corners, corners)
        mask = np.ones(shape[:2], dtype=np.uint8) * 255
        return CourtHomography(M, M_inv, mask, confidence=0.4, corners_px=corners)