"""
Exports analysis data in the replay JSON format consumed
by the frontend tacticalReplay.js component.
"""
from typing import List, Dict, Optional
import json

def export_replay(
    frames_count: int,
    fps: int,
    shuttle_detections: List[Dict],
    player_data: List,          # List[FramePlayerData]
    shot_events: List[Dict],
    court_corners_px: Optional[List] = None,
) -> Dict:
    """
    Returns the ReplayData JSON object (see Data Contracts section).
    """
    frames = []

    for i in range(frames_count):
        frame_entry: Dict = {"frame": i, "t_ms": round(i / fps * 1000, 1)}

        # Shuttle position
        det = shuttle_detections[i] if i < len(shuttle_detections) else {}
        if 0 in det:
            x1,y1,x2,y2 = det[0]
            frame_entry["shuttle"] = {
                "px": round((x1+x2)/2, 1),
                "py": round((y1+y2)/2, 1),
            }

        # Player positions
        players_entry = []
        if i < len(player_data):
            fd = player_data[i]
            for tid, ps in fd.players.items():
                pe = {
                    "id": tid,
                    "team": ps.team,
                    "px": round(ps.center_px[0], 1),
                    "py": round(ps.center_px[1], 1),
                    "pose": ps.pose_label,
                }
                if ps.center_m:
                    pe["mx"] = round(ps.center_m[0], 3)
                    pe["my"] = round(ps.center_m[1], 3)
                players_entry.append(pe)
        frame_entry["players"] = players_entry

        frames.append(frame_entry)

    return {
        "version": "1.0",
        "fps": fps,
        "total_frames": frames_count,
        "court_corners_px": court_corners_px,
        "frames": frames,
        "shot_events": shot_events,
    }