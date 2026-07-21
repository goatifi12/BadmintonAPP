from __future__ import annotations

from pathlib import Path

from app.pipeline.analytics import AnalyticsEngine


class IdentityCourt:
    def pixel_to_court(self, px: float, py: float) -> tuple[float, float]:
        return px, py


def test_analytics_builds_required_stats_and_heatmaps(tmp_path: Path) -> None:
    engine = AnalyticsEngine(tmp_path)
    points = [{"px": float(i) / 10, "py": float(i) / 20} for i in range(20)]
    players = [
        [
            {"track_id": 1, "team": 0, "center_m": [1.0 + i * 0.01, 3.0], "confidence": 0.9},
            {"track_id": 2, "team": 1, "center_m": [5.0 - i * 0.01, 10.0], "confidence": 0.8},
        ]
        for i in range(20)
    ]
    stroke_data = {
        "speeds": [0, 20, 40, 80, 30, 0],
        "shot_events": [
            {
                "frame": 3,
                "timestamp": 0.1,
                "stroke_type": "drop",
                "shot_type": "drop",
                "speed": 80,
                "v_angle": -12,
                "landing_m": [2.0, 4.0],
                "landing_px": [2.0, 4.0],
                "confidence": 0.7,
                "player_id": 1,
            }
        ],
        "stroke_counts": {"drop": 1},
        "stroke_quality": {"drop": {"count": 1}},
    }

    metrics, tactical, qualities, paths = engine.build("test-job", points, players, stroke_data, 30, IdentityCourt())

    assert metrics["shot_stats"]["total_shots"] == 1
    assert "rally_stats" in metrics
    assert "movement" in metrics
    assert tactical["heatmaps"]["player"]["0"]
    assert tactical["heatmaps"]["shots"]["drop"]
    assert qualities[0]["stroke_type"] == "drop"
    assert paths
    assert all(path.exists() for path in paths.values())


def test_analytics_handles_empty_input_without_crashing(tmp_path: Path) -> None:
    engine = AnalyticsEngine(tmp_path)
    stroke_data = {"speeds": [], "shot_events": [], "stroke_counts": {}, "stroke_quality": {}}

    metrics, tactical, qualities, paths = engine.build("empty-job", [], [], stroke_data, 30, IdentityCourt())

    assert metrics["shot_stats"]["total_shots"] == 0
    assert metrics["avg_shuttle_speed_km_h"] == 0
    assert qualities == []
    assert tactical["weaknesses"][0]["type"] == "tracking_quality"
