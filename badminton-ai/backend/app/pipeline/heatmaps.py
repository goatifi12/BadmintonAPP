from __future__ import annotations

from pathlib import Path
from typing import Iterable

import cv2
import numpy as np

COURT_W = 6.1
COURT_H = 13.4


def empty_grid(size: int = 10) -> list[list[float]]:
    return [[0.0 for _ in range(size)] for _ in range(size)]


def normalize_grid(grid: list[list[float]]) -> list[list[float]]:
    top = max([max(row) for row in grid] or [1]) or 1
    return [[round(float(v) / top, 3) for v in row] for row in grid]


def points_to_grid(points: Iterable[tuple[float, float]], size: int = 10) -> list[list[float]]:
    grid = empty_grid(size)
    for x, y in points:
        gx = min(size - 1, max(0, int(float(x) / COURT_W * size)))
        gy = min(size - 1, max(0, int(float(y) / COURT_H * size)))
        grid[gy][gx] += 1
    return normalize_grid(grid)


def write_heatmap_png(grid: list[list[float]], path: Path, color: tuple[int, int, int] = (28, 105, 224)) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    h, w = 660, 300
    image = np.full((h, w, 3), 245, dtype=np.uint8)
    margin = 20
    court = (margin, margin, w - margin, h - margin)
    cv2.rectangle(image, (court[0], court[1]), (court[2], court[3]), (35, 45, 60), 2)
    cv2.line(image, (court[0], h // 2), (court[2], h // 2), (35, 45, 60), 1)
    cv2.line(image, (w // 2, court[1]), (w // 2, court[3]), (35, 45, 60), 1)
    cv2.line(image, (court[0], court[1] + 120), (court[2], court[1] + 120), (35, 45, 60), 1)
    cv2.line(image, (court[0], court[3] - 120), (court[2], court[3] - 120), (35, 45, 60), 1)

    arr = np.array(grid or empty_grid(), dtype=np.float32)
    arr = cv2.resize(arr, (court[2] - court[0], court[3] - court[1]), interpolation=cv2.INTER_CUBIC)
    arr = np.clip(arr, 0, 1)
    overlay = np.zeros_like(image)
    bgr = np.array([color[2], color[1], color[0]], dtype=np.uint8)
    overlay[court[1]:court[3], court[0]:court[2]] = (arr[..., None] * bgr).astype(np.uint8)
    alpha = np.zeros((h, w, 1), dtype=np.float32)
    alpha[court[1]:court[3], court[0]:court[2], 0] = arr * 0.65
    image = (image * (1 - alpha) + overlay * alpha).astype(np.uint8)
    cv2.imwrite(str(path), image)
