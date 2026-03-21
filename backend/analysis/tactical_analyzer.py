"""
Tactical analysis: heatmaps, weaknesses, coaching insights.
"""
from typing import List, Dict, Optional, Tuple
import math
from collections import defaultdict

class TacticalAnalyzer:

    def analyze(
        self,
        player_data: list,           # List[FramePlayerData]
        shot_qualities: list,        # List[ShotQuality]
        rally_data: list,            # List[rally dicts]
        court_w_m: float = 5.18,
        court_h_m: float = 13.4,
    ) -> Dict:

        player_heatmaps = self._build_heatmaps(player_data, court_w_m, court_h_m)
        movement_stats  = self._movement_stats(player_data)
        shot_patterns   = self._shot_patterns(shot_qualities)
        weaknesses      = self._identify_weaknesses(
            player_heatmaps, shot_patterns, movement_stats
        )
        coaching_tips   = self._generate_coaching_tips(weaknesses, shot_patterns)

        return {
            "heatmaps":        player_heatmaps,
            "movement_stats":  movement_stats,
            "shot_patterns":   shot_patterns,
            "weaknesses":      weaknesses,
            "coaching_tips":   coaching_tips,
        }

    def _build_heatmaps(self, player_data, cw, ch) -> Dict:
        """
        Returns 10×10 grid heatmaps (normalized 0–1) per team.
        """
        grid_size = 10
        heatmaps = defaultdict(lambda: [[0]*grid_size for _ in range(grid_size)])

        for fd in player_data:
            for tid, ps in fd.players.items():
                if ps.center_m is None:
                    continue
                mx, my = ps.center_m
                gx = min(int(mx / cw * grid_size), grid_size - 1)
                gy = min(int(my / ch * grid_size), grid_size - 1)
                heatmaps[ps.team][gy][gx] += 1

        # Normalize each team's heatmap 0–1
        result = {}
        for team, grid in heatmaps.items():
            flat = [v for row in grid for v in row]
            mx_val = max(flat) or 1
            result[team] = [[v/mx_val for v in row] for row in grid]

        return result

    def _movement_stats(self, player_data) -> Dict:
        prev_pos = {}
        distances = defaultdict(float)
        speeds    = defaultdict(list)

        for fd in player_data:
            for tid, ps in fd.players.items():
                if ps.center_m and tid in prev_pos:
                    dx = ps.center_m[0] - prev_pos[tid][0]
                    dy = ps.center_m[1] - prev_pos[tid][1]
                    d  = math.sqrt(dx*dx + dy*dy)
                    distances[tid] += d
                    speeds[tid].append(d * 30)  # m/s at 30fps

                if ps.center_m:
                    prev_pos[tid] = ps.center_m

        stats = {}
        for tid in distances:
            sp = speeds[tid]
            stats[tid] = {
                "total_distance_m": round(distances[tid], 2),
                "avg_speed_ms":     round(sum(sp)/len(sp), 2) if sp else 0,
                "max_speed_ms":     round(max(sp), 2) if sp else 0,
            }
        return stats

    def _shot_patterns(self, shot_qualities) -> Dict:
        by_type = defaultdict(list)
        for sq in shot_qualities:
            by_type[sq.stroke_type].append(sq.score)

        patterns = {}
        for stype, scores in by_type.items():
            patterns[stype] = {
                "count":     len(scores),
                "avg_score": round(sum(scores)/len(scores), 1),
                "excellent": sum(1 for s in scores if s >= 80),
                "poor":      sum(1 for s in scores if s < 40),
            }
        return patterns

    def _identify_weaknesses(self, heatmaps, shot_patterns, movement_stats) -> List[Dict]:
        weaknesses = []

        # Check smash conversion
        smash = shot_patterns.get('smash', {})
        if smash and smash.get('avg_score', 100) < 55:
            weaknesses.append({
                "type": "stroke_quality",
                "stroke": "smash",
                "severity": "high",
                "message": "Smash average score is below 55. Consider improving wrist snap and targeting deep sidelines."
            })

        # Check if player rarely covers net
        for team, grid in heatmaps.items():
            front_coverage = sum(grid[0]) + sum(grid[1])
            total_coverage = sum(v for row in grid for v in row)
            if total_coverage > 0 and front_coverage / total_coverage < 0.1:
                weaknesses.append({
                    "type": "positioning",
                    "team": team,
                    "severity": "medium",
                    "message": f"Team {team} rarely covers the forecourt — vulnerable to net drops."
                })

        # Check movement speed
        for tid, stats in movement_stats.items():
            if stats['avg_speed_ms'] < 0.5:
                weaknesses.append({
                    "type": "movement",
                    "player": tid,
                    "severity": "medium",
                    "message": f"Player {tid} shows limited court coverage — focus on split-step recovery drills."
                })

        return weaknesses

    def _generate_coaching_tips(self, weaknesses, shot_patterns) -> List[str]:
        tips = []
        for w in weaknesses:
            tips.append(w['message'])

        # Generic pattern-based tips
        drop = shot_patterns.get('drop', {})
        if drop and drop.get('count', 0) < 5:
            tips.append("Incorporate more drop shots to vary pace and pull opponent forward.")

        clear = shot_patterns.get('clear', {})
        if clear and clear.get('poor', 0) > clear.get('excellent', 0):
            tips.append("Clears are below target depth. Hit with higher trajectory to push opponent deeper.")

        return tips