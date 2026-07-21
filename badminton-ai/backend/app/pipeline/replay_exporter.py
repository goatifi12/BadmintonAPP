from __future__ import annotations


def export_replay(job_id: str, fps: float, total_frames: int, court, shuttle_points: list[dict | None], player_frames: list[list[dict]], shot_events: list[dict], shot_qualities: list[dict]) -> dict:
    quality_by_frame = {q.get("frame"): q for q in shot_qualities}
    frames = []
    for i in range(total_frames):
        shuttle = None
        point = shuttle_points[i] if i < len(shuttle_points) else None
        if point:
            mx, my = court.pixel_to_court(point["px"], point["py"])
            shuttle = {"px": point["px"], "py": point["py"], "mx": mx, "my": my}
        frames.append(
            {
                "frame": i,
                "t_ms": round(i / fps * 1000, 2),
                "shuttle": shuttle,
                "players": [
                    {
                        "id": p.get("track_id"),
                        "team": p.get("team"),
                        "px": p.get("center_px", [None, None])[0],
                        "py": p.get("center_px", [None, None])[1],
                        "mx": (p.get("center_m") or [None, None])[0],
                        "my": (p.get("center_m") or [None, None])[1],
                        "pose": p.get("pose_label", "upright"),
                    }
                    for p in (player_frames[i] if i < len(player_frames) else [])
                ],
            }
        )
    replay_events = []
    for event in shot_events:
        quality = quality_by_frame.get(event["frame"], {})
        landing = event.get("landing_m")
        replay_events.append(
            {
                "frame": event["frame"],
                "stroke_type": event["stroke_type"],
                "score": quality.get("score", 0),
                "grade": quality.get("grade", "Neutral"),
                "player_id": event.get("player_id"),
                "landing_m": landing,
                "speed_km_h": event.get("speed", 0),
                "explanation": quality.get("explanation", ""),
            }
        )
    return {"version": "1.0", "fps": fps, "total_frames": total_frames, "court_corners_px": court.corners_px, "frames": frames, "shot_events": replay_events}
