from __future__ import annotations

from collections import defaultdict
from math import hypot
from pathlib import Path
from statistics import mean
from typing import Any

from app.pipeline.heatmaps import empty_grid, points_to_grid, write_heatmap_png
from app.pipeline.shot_evaluator import ShotEvaluator


class AnalyticsEngine:
    def __init__(self, output_dir: Path) -> None:
        self.output_dir = output_dir
        self.evaluator = ShotEvaluator()

    def build(
        self,
        job_id: str,
        points: list[dict | None],
        players: list[list[dict]],
        stroke_data: dict[str, Any],
        fps: float,
        court,
    ) -> tuple[dict[str, Any], dict[str, Any], list[dict[str, Any]], dict[str, Path]]:
        shot_events = stroke_data["shot_events"]
        shot_qualities = []
        for shot in shot_events:
            enriched = dict(shot)
            if shot.get("landing_m"):
                enriched["landing_norm"] = (shot["landing_m"][0] / 6.1, shot["landing_m"][1] / 13.4)
            quality = self.evaluator.evaluate(enriched)
            quality["frame"] = shot["frame"]
            quality["stroke_type"] = shot["stroke_type"]
            shot_qualities.append(quality)

        player_tracks = self._flatten_player_tracks(players, fps)
        player_heatmaps = self._player_heatmaps(players)
        shot_heatmaps = self._shot_heatmaps(shot_events)
        movement_heatmaps = self._movement_heatmaps(player_tracks)
        heatmap_paths = self._write_heatmaps(job_id, player_heatmaps, shot_heatmaps, movement_heatmaps)

        speeds = [s for s in stroke_data.get("speeds", []) if s]
        counts = stroke_data.get("stroke_counts", {})
        rally_stats = self._rally_stats(shot_events, fps)
        movement = self._movement_stats(player_tracks)

        metrics = {
            "avg_shuttle_speed_km_h": round(float(mean(speeds or [0])), 1),
            "max_shuttle_speed_km_h": round(float(max(speeds or [0])), 1),
            "min_speed_km_h": round(float(min(speeds or [0])), 1),
            "speed_variance": round(self._variance(speeds), 1),
            "avg_rally_length_seconds": rally_stats["average_rally_length_seconds"],
            "total_rallies": rally_stats["rally_count"],
            "total_distance_meters": round(self._shuttle_distance(points, court), 1),
            "movement_smoothness": self._movement_smoothness(player_tracks),
            "stroke_counts": counts,
            "stroke_quality": stroke_data.get("stroke_quality", {}),
            "shot_stats": self._shot_stats(shot_events, shot_qualities),
            "rally_stats": rally_stats,
            "movement": movement,
        }
        tactical = {
            "heatmaps": {
                "0": player_heatmaps.get("0", empty_grid()),
                "1": player_heatmaps.get("1", empty_grid()),
                "player": player_heatmaps,
                "shots": shot_heatmaps,
                "movement": movement_heatmaps,
                "exports": {name: f"{job_id}/{path.name}" for name, path in heatmap_paths.items()},
            },
            "movement_stats": movement,
            "shot_patterns": self._shot_patterns(shot_qualities),
            "weaknesses": self._weaknesses(metrics),
            "coaching_tips": self._fallback_tips(metrics),
        }
        return metrics, tactical, shot_qualities, heatmap_paths

    def _flatten_player_tracks(self, players: list[list[dict]], fps: float) -> list[dict[str, Any]]:
        previous: dict[int, tuple[float, float]] = {}
        out: list[dict[str, Any]] = []
        for frame_no, frame_players in enumerate(players):
            for player in frame_players:
                center = player.get("center_m")
                pid = player.get("track_id")
                if center is None or pid is None:
                    continue
                px, py = float(center[0]), float(center[1])
                prev = previous.get(pid)
                speed = hypot(px - prev[0], py - prev[1]) * fps if prev else 0.0
                previous[pid] = (px, py)
                out.append(
                    {
                        "frame": frame_no,
                        "timestamp": round(frame_no / fps, 3),
                        "player_id": int(pid),
                        "team": str(player.get("team", 0)),
                        "x": round(px, 3),
                        "y": round(py, 3),
                        "speed": round(speed, 3),
                        "confidence": float(player.get("confidence", 0)),
                    }
                )
        return out

    def _player_heatmaps(self, players: list[list[dict]]) -> dict[str, list[list[float]]]:
        points: dict[str, list[tuple[float, float]]] = defaultdict(list)
        for frame_players in players:
            for player in frame_players:
                center = player.get("center_m")
                if center:
                    points[str(player.get("team", 0))].append((float(center[0]), float(center[1])))
        return {team: points_to_grid(team_points) for team, team_points in points.items()} or {"0": empty_grid(), "1": empty_grid()}

    def _shot_heatmaps(self, shots: list[dict[str, Any]]) -> dict[str, list[list[float]]]:
        points: dict[str, list[tuple[float, float]]] = defaultdict(list)
        for shot in shots:
            landing = shot.get("landing_m")
            if landing:
                points[shot["stroke_type"]].append((float(landing[0]), float(landing[1])))
                if shot["stroke_type"] in {"smash", "drop", "clear"}:
                    points[f"{shot['stroke_type']}_landing"].append((float(landing[0]), float(landing[1])))
        return {name: points_to_grid(group) for name, group in points.items()}

    def _movement_heatmaps(self, tracks: list[dict[str, Any]]) -> dict[str, list[list[float]]]:
        points: dict[str, list[tuple[float, float]]] = defaultdict(list)
        for track in tracks:
            points[str(track["player_id"])].append((track["x"], track["y"]))
        return {pid: points_to_grid(group) for pid, group in points.items()}

    def _write_heatmaps(
        self,
        job_id: str,
        player_heatmaps: dict[str, list[list[float]]],
        shot_heatmaps: dict[str, list[list[float]]],
        movement_heatmaps: dict[str, list[list[float]]],
    ) -> dict[str, Path]:
        outputs: dict[str, Path] = {}
        color_map = {
            "player_0": (28, 105, 224),
            "player_1": (220, 63, 79),
            "smash_landing": (220, 63, 79),
            "drop_landing": (15, 139, 111),
            "clear_landing": (216, 145, 24),
        }
        for prefix, maps in [("player", player_heatmaps), ("shot", shot_heatmaps), ("movement", movement_heatmaps)]:
            for name, grid in maps.items():
                key = f"{prefix}_{name}"
                path = self.output_dir / f"{key}_heatmap.png"
                write_heatmap_png(grid, path, color_map.get(key, (91, 124, 250)))
                outputs[key] = path
        return outputs

    def _rally_stats(self, shots: list[dict[str, Any]], fps: float) -> dict[str, Any]:
        if not shots:
            return {"rally_count": 0, "average_rally_length_seconds": 0, "longest_rally_seconds": 0, "shot_sequences": []}
        rallies: list[list[dict[str, Any]]] = [[]]
        previous_frame = shots[0]["frame"]
        for shot in shots:
            if shot["frame"] - previous_frame > int(fps * 8) and rallies[-1]:
                rallies.append([])
            rallies[-1].append(shot)
            previous_frame = shot["frame"]
        lengths = [(r[-1]["frame"] - r[0]["frame"]) / fps for r in rallies if r]
        return {
            "rally_count": len(rallies),
            "average_rally_length_seconds": round(float(mean(lengths or [0])), 1),
            "longest_rally_seconds": round(float(max(lengths or [0])), 1),
            "shot_sequences": [[s["stroke_type"] for s in rally[:12]] for rally in rallies[:12]],
        }

    def _shot_stats(self, shots: list[dict[str, Any]], qualities: list[dict[str, Any]]) -> dict[str, Any]:
        total = len(shots)
        counts = defaultdict(int)
        for shot in shots:
            counts[shot["stroke_type"]] += 1
        good = sum(1 for q in qualities if q.get("score", 0) >= 70)
        poor = sum(1 for q in qualities if q.get("score", 0) < 40)
        return {
            "total_shots": total,
            "distribution": dict(counts),
            "shot_accuracy": round(good / max(total, 1) * 100, 1),
            "winning_shot_percentage": round(good / max(total, 1) * 100, 1),
            "error_percentage": round(poor / max(total, 1) * 100, 1),
        }

    def _movement_stats(self, tracks: list[dict[str, Any]]) -> dict[str, Any]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for track in tracks:
            grouped[str(track["player_id"])].append(track)
        out: dict[str, Any] = {}
        for pid, rows in grouped.items():
            distance = 0.0
            for i in range(1, len(rows)):
                distance += hypot(rows[i]["x"] - rows[i - 1]["x"], rows[i]["y"] - rows[i - 1]["y"])
            speeds = [r["speed"] for r in rows if r["speed"]]
            unique_cells = len({(int(r["x"] / 6.1 * 10), int(r["y"] / 13.4 * 10)) for r in rows})
            out[pid] = {
                "total_distance_m": round(distance, 2),
                "avg_speed_ms": round(float(mean(speeds or [0])), 2),
                "max_speed_ms": round(float(max(speeds or [0])), 2),
                "court_coverage_percentage": round(unique_cells, 1),
                "movement_efficiency": round(min(100.0, unique_cells * 4.0), 1),
                "recovery_speed_ms": round(float(mean(sorted(speeds or [0], reverse=True)[:5] or [0])), 2),
                "tracking_quality": "observed",
            }
        return out

    def _shot_patterns(self, qualities: list[dict[str, Any]]) -> dict[str, Any]:
        patterns: dict[str, Any] = {}
        for quality in qualities:
            stroke = quality["stroke_type"]
            bucket = patterns.setdefault(stroke, {"count": 0, "scores": [], "excellent": 0, "good": 0, "poor": 0})
            bucket["count"] += 1
            bucket["scores"].append(quality.get("score", 0))
            bucket["excellent"] += 1 if quality.get("grade") == "Excellent" else 0
            bucket["good"] += 1 if quality.get("grade") == "Good" else 0
            bucket["poor"] += 1 if quality.get("grade") == "Poor" else 0
        for bucket in patterns.values():
            bucket["avg_score"] = round(float(mean(bucket.pop("scores") or [0])), 1)
        return patterns

    def _weaknesses(self, metrics: dict[str, Any]) -> list[dict[str, Any]]:
        weaknesses: list[dict[str, Any]] = []
        if metrics["shot_stats"]["total_shots"] == 0:
            weaknesses.append({"type": "tracking_quality", "severity": "high", "message": "No reliable shot events were recovered from this upload."})
        if not weaknesses:
            weaknesses.append({"type": "pattern", "severity": "low", "message": "Shot mix is balanced. Improve by increasing quality under pressure."})
        return weaknesses[:5]

    def _fallback_tips(self, metrics: dict[str, Any]) -> list[str]:
        tips = []
        if metrics["shot_stats"]["total_shots"] == 0:
            tips.append("Record from behind the baseline with the full court and shuttle visible before using this as a coaching report.")
        tips.append("Review Tactical Replay and pause after each lift to check your recovery base.")
        return tips[:5]

    def _shuttle_distance(self, points: list[dict | None], court) -> float:
        distance = 0.0
        previous = None
        for point in points:
            if not point:
                previous = None
                continue
            cur = court.pixel_to_court(point["px"], point["py"])
            if previous:
                distance += hypot(cur[0] - previous[0], cur[1] - previous[1])
            previous = cur
        return float(distance)

    def _movement_smoothness(self, tracks: list[dict[str, Any]]) -> float:
        speeds = [t["speed"] for t in tracks if t["speed"]]
        if not speeds:
            return 0.0
        return round(max(0.0, 1.0 - self._variance(speeds) / 25), 2)

    def _variance(self, values: list[float]) -> float:
        if not values:
            return 0.0
        avg = mean(values)
        return float(mean([(v - avg) ** 2 for v in values]))
