from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import cv2
import numpy as np

from app.pipeline.models import StageEvidence

COURT_W = 6.1
COURT_H = 13.4


@dataclass
class CourtHomography:
    matrix: np.ndarray
    inverse_matrix: np.ndarray
    court_mask: np.ndarray
    confidence: float
    corners_px: list[list[float]]

    def pixel_to_court(self, px: float, py: float) -> tuple[float, float]:
        pt = np.array([[[px, py]]], dtype=np.float32)
        out = cv2.perspectiveTransform(pt, self.matrix)[0][0]
        return float(out[0]), float(out[1])

    def court_to_pixel(self, mx: float, my: float) -> tuple[float, float]:
        pt = np.array([[[mx, my]]], dtype=np.float32)
        out = cv2.perspectiveTransform(pt, self.inverse_matrix)[0][0]
        return float(out[0]), float(out[1])


def _fallback(frame_w: int, frame_h: int, confidence: float = 0.25) -> CourtHomography:
    src = np.float32([[0, 0], [frame_w, 0], [frame_w, frame_h], [0, frame_h]])
    dst = np.float32([[0, 0], [COURT_W, 0], [COURT_W, COURT_H], [0, COURT_H]])
    matrix = cv2.getPerspectiveTransform(src, dst)
    inverse = cv2.getPerspectiveTransform(dst, src)
    mask = np.ones((frame_h, frame_w), dtype=np.uint8) * 255
    return CourtHomography(matrix, inverse, mask, confidence, src.astype(float).tolist())


def detect_court(frame: np.ndarray | None) -> CourtHomography:
    if frame is None:
        return _fallback(1280, 720, 0.1)

    frame_h, frame_w = frame.shape[:2]
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 60, 160)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 120, minLineLength=frame_w * 0.25, maxLineGap=35)
    if lines is None or len(lines) < 4:
        return _fallback(frame_w, frame_h)

    pts: list[tuple[int, int]] = []
    for line in lines[:80]:
        x1, y1, x2, y2 = line[0]
        pts.extend([(x1, y1), (x2, y2)])

    corners = _bounding_corners(pts, frame_w, frame_h)
    area = cv2.contourArea(np.float32(corners))
    confidence = float(min(0.95, max(0.0, area / (frame_w * frame_h))))
    if confidence < 0.5:
        return _fallback(frame_w, frame_h, confidence)

    src = np.float32(corners)
    dst = np.float32([[0, 0], [COURT_W, 0], [COURT_W, COURT_H], [0, COURT_H]])
    matrix = cv2.getPerspectiveTransform(src, dst)
    inverse = cv2.getPerspectiveTransform(dst, src)
    mask = np.zeros((frame_h, frame_w), dtype=np.uint8)
    cv2.fillConvexPoly(mask, src.astype(np.int32), 255)
    return CourtHomography(matrix, inverse, mask, confidence, src.astype(float).tolist())


def _bounding_corners(points: Iterable[tuple[int, int]], frame_w: int, frame_h: int) -> list[list[float]]:
    arr = np.array(list(points), dtype=np.float32)
    if len(arr) == 0:
        return [[0, 0], [frame_w, 0], [frame_w, frame_h], [0, frame_h]]
    x_min, y_min = arr.min(axis=0)
    x_max, y_max = arr.max(axis=0)
    return [[x_min, y_min], [x_max, y_min], [x_max, y_max], [x_min, y_max]]


class CourtCalibrationStage:
    """Thin wrapper around `detect_court` that also reports StageEvidence.
    Kept as its own stage — rather than inlined into the orchestrator — so a
    future learned court-keypoint model can replace `run()` without touching
    the homography contract the rest of the pipeline depends on.
    """

    def run(self, first_frame: np.ndarray | None) -> tuple[CourtHomography, StageEvidence]:
        court = detect_court(first_frame)
        warnings = []
        if court.confidence < 0.5:
            warnings.append("Court calibration fell back to a full-frame homography. Use a full-court camera angle for better court-space metrics.")
        evidence = StageEvidence(
            name="court",
            method="Hough-line homography with full-frame fallback",
            confidence=float(court.confidence),
            warnings=warnings,
            details={"corners_px": court.corners_px},
        )
        return court, evidence
