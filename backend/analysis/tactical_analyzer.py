"""
tactical_analyzer.py

FIXES:
  1. All output lists (weaknesses, coaching_tips) capped at 5 items.
  2. For singles mode the analyzer ignores any player IDs beyond the
     2 largest (referees / spectators that slipped through tracking).
  3. Heatmaps built per TEAM not per raw track_id, so singles always
     shows 2 heatmaps regardless of how many IDs were detected.
"""
from typing import List, Dict, Optional, Tuple
import math
from collections import defaultdict


class TacticalAnalyzer:

    MAX_TIPS = 5   # maximum items in weaknesses or coaching_tips

    def analyze(
        self,
        player_data:    list,
        shot_qualities: list,
        rally_data:     list,
        court_w_m:      float = 6.1,
        court_h_m:      float = 13.4,
    ) -> Dict:

        # ── Determine mode from player data ──────────────────────────
        mode = "singles"
        for fd in player_data:
            if hasattr(fd, 'mode'):
                mode = fd.mode
                break
        max_players = 2 if mode == "singles" else 4

        # ── Restrict to the correct number of players ─────────────
        # Pick the IDs that appear most frequently (the real players)
        id_counts: Dict[int, int] = defaultdict(int)
        for fd in player_data:
            for tid in fd.players:
                id_counts[tid] += 1
        # Keep only the top max_players IDs by frequency
        allowed_ids = set(
            sorted(id_counts, key=lambda x: id_counts[x], reverse=True)[:max_players]
        )

        player_heatmaps = self._build_heatmaps(
            player_data, allowed_ids, court_w_m, court_h_m
        )
        movement_stats  = self._movement_stats(player_data, allowed_ids)
        shot_patterns   = self._shot_patterns(shot_qualities)
        weaknesses      = self._identify_weaknesses(
            player_heatmaps, shot_patterns, movement_stats
        )
        coaching_tips   = self._generate_coaching_tips(weaknesses, shot_patterns)

        # ── Hard cap at 5 ─────────────────────────────────────────
        weaknesses    = weaknesses[:self.MAX_TIPS]
        coaching_tips = coaching_tips[:self.MAX_TIPS]

        return {
            "heatmaps":       player_heatmaps,
            "movement_stats": movement_stats,
            "shot_patterns":  shot_patterns,
            "weaknesses":     weaknesses,
            "coaching_tips":  coaching_tips,
        }

    # ── Heatmaps (keyed by team 0/1) ─────────────────────────────────
    def _build_heatmaps(
        self,
        player_data,
        allowed_ids: set,
        cw: float,
        ch: float,
    ) -> Dict:
        grid_size = 10
        heatmaps  = defaultdict(lambda: [[0] * grid_size for _ in range(grid_size)])

        for fd in player_data:
            for tid, ps in fd.players.items():
                if tid not in allowed_ids:
                    continue
                if ps.center_m is None:
                    continue
                mx, my = ps.center_m
                gx = min(int(mx / cw * grid_size), grid_size - 1)
                gy = min(int(my / ch * grid_size), grid_size - 1)
                # Use team as the heatmap key so singles always has 0 and 1
                heatmaps[ps.team][gy][gx] += 1

        result = {}
        for team, grid in heatmaps.items():
            flat    = [v for row in grid for v in row]
            max_val = max(flat) or 1
            result[str(team)] = [[round(v / max_val, 3) for v in row] for row in grid]

        return result

    # ── Movement stats ────────────────────────────────────────────────
    def _movement_stats(self, player_data, allowed_ids: set) -> Dict:
        prev_pos  = {}
        distances = defaultdict(float)
        speeds    = defaultdict(list)

        for fd in player_data:
            for tid, ps in fd.players.items():
                if tid not in allowed_ids:
                    continue
                if ps.center_m and tid in prev_pos:
                    dx = ps.center_m[0] - prev_pos[tid][0]
                    dy = ps.center_m[1] - prev_pos[tid][1]
                    d  = math.sqrt(dx * dx + dy * dy)
                    distances[tid] += d
                    speeds[tid].append(d * 30)
                if ps.center_m:
                    prev_pos[tid] = ps.center_m

        stats = {}
        for tid in distances:
            sp = speeds[tid]
            stats[str(tid)] = {
                "total_distance_m": round(distances[tid], 2),
                "avg_speed_ms":     round(sum(sp) / len(sp), 2) if sp else 0,
                "max_speed_ms":     round(max(sp), 2) if sp else 0,
            }
        return stats

    # ── Shot patterns ────────────────────────────────────────────────
    def _shot_patterns(self, shot_qualities) -> Dict:
        by_type = defaultdict(list)
        for sq in shot_qualities:
            by_type[sq.stroke_type].append(sq.score)

        patterns = {}
        for stype, scores in by_type.items():
            patterns[stype] = {
                "count":     len(scores),
                "avg_score": round(sum(scores) / len(scores), 1),
                "excellent": sum(1 for s in scores if s >= 80),
                "poor":      sum(1 for s in scores if s < 40),
            }
        return patterns

    # ── Weaknesses (max MAX_TIPS) ────────────────────────────────────
    def _identify_weaknesses(
        self,
        heatmaps:       Dict,
        shot_patterns:  Dict,
        movement_stats: Dict,
    ) -> List[Dict]:
        weaknesses = []

        # Check smash quality
        smash = shot_patterns.get('smash', {})
        if smash and smash.get('avg_score', 100) < 55:
            weaknesses.append({
                "type": "stroke_quality", "stroke": "smash",
                "severity": "high",
                "message": "Smash average quality is below 55. Work on steeper contact angle and targeting deep sidelines.",
            })

        # Check forecourt coverage
        for team_str, grid in heatmaps.items():
            front_total = sum(grid[0]) + sum(grid[1])
            all_total   = sum(v for row in grid for v in row)
            if all_total > 0 and front_total / all_total < 0.08:
                weaknesses.append({
                    "type": "positioning", "team": int(team_str),
                    "severity": "medium",
                    "message": f"Player {team_str} rarely covers the forecourt — vulnerable to tight net drops.",
                })
                if len(weaknesses) >= self.MAX_TIPS:
                    return weaknesses

        # Check movement speed
        for tid_str, stats in movement_stats.items():
            if stats['avg_speed_ms'] < 0.4:
                weaknesses.append({
                    "type": "movement", "player": tid_str,
                    "severity": "medium",
                    "message": f"Player {tid_str} has limited court coverage. Focus on split-step recovery.",
                })
                if len(weaknesses) >= self.MAX_TIPS:
                    return weaknesses

        # Check drop quality
        drop = shot_patterns.get('drop', {})
        if drop and drop.get('poor', 0) > drop.get('excellent', 0):
            weaknesses.append({
                "type": "stroke_quality", "stroke": "drop",
                "severity": "medium",
                "message": "Drop shots have more poor ratings than excellent. Aim tighter to the net.",
            })

        return weaknesses[:self.MAX_TIPS]

    # ── Coaching tips (max MAX_TIPS) ─────────────────────────────────
    def _generate_coaching_tips(
        self,
        weaknesses:    List[Dict],
        shot_patterns: Dict,
    ) -> List[str]:
        tips = []

        # Convert weaknesses directly to tips first
        for w in weaknesses:
            tips.append(w['message'])
            if len(tips) >= self.MAX_TIPS:
                return tips

        # Pattern-based tips
        drop = shot_patterns.get('drop', {})
        if drop and drop.get('count', 0) < 3:
            tips.append("Incorporate more drop shots to vary pace and pull your opponent forward.")
        if len(tips) >= self.MAX_TIPS:
            return tips[:self.MAX_TIPS]

        clear = shot_patterns.get('clear', {})
        if clear and clear.get('poor', 0) > clear.get('excellent', 0):
            tips.append("Clears are landing short. Hit with a higher trajectory to push opponent to back court.")
        if len(tips) >= self.MAX_TIPS:
            return tips[:self.MAX_TIPS]

        lift = shot_patterns.get('lift', {})
        if lift and lift.get('avg_score', 100) < 50:
            tips.append("Lifts are below average quality. Aim for deep corners to give yourself recovery time.")

        return tips[:self.MAX_TIPS]