import os
import sys
import uuid
import time
import json
from fastapi import FastAPI, UploadFile, File, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from analysis_storage import AnalysisStorage

# ============================================================
# PATH SETUP
# ============================================================
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

analysis_running = False

if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================================
# IMPORTS
# ============================================================
from badminton_model.tracker.shuttle_tracker import ShuttleTracker
from badminton_model.utils import read_video, save_video

from analysis.footwork import analyze_footwork
from analysis.advanced_analytics import compute_advanced_analytics
from analysis.court_detector import CourtDetector
from analysis.kalman_smoother import KalmanShuttleSmoother
from analysis.shot_evaluator import ShotEvaluator
from analysis.tactical_analyzer import TacticalAnalyzer
from analysis.replay_exporter import export_replay

# ============================================================
# MODEL PATHS
# ============================================================
SHUTTLE_MODEL_PATH = os.path.join(
    PROJECT_DIR,
    "badminton_model", "train", "shuttle_output",
    "models", "weights", "best.pt"
)

if not os.path.isfile(SHUTTLE_MODEL_PATH):
    raise FileNotFoundError(f"❌ Shuttle model not found at: {SHUTTLE_MODEL_PATH}")

# Player model: look for a local copy first, otherwise let
# Ultralytics auto-download the pretrained weights on first run.
_local_pose = os.path.join(
    PROJECT_DIR,
    "badminton_model", "train", "player_output", "weights", "yolov8m-pose.pt"
)
PLAYER_MODEL_PATH = _local_pose if os.path.isfile(_local_pose) else "yolov8m-pose.pt"

# ============================================================
# LOAD MODELS
# ============================================================
print("🚀 Loading shuttle tracker model...")
shuttle_tracker = ShuttleTracker(SHUTTLE_MODEL_PATH)
print("✅ Shuttle model loaded!")

# ── FIX 1: Player tracker loads safely ──────────────────────
# Wrapped in try/except so the server still starts even if the
# pose model hasn't been downloaded yet.  When it is None the
# analysis pipeline skips player tracking gracefully instead
# of crashing the whole server.
player_tracker_v2 = None
try:
    from analysis.player_tracker_v2 import PlayerTrackerV2
    print("🚀 Loading player tracker v2 (YOLOv8-pose)...")
    player_tracker_v2 = PlayerTrackerV2(model_path=PLAYER_MODEL_PATH, mode="singles")
    print("✅ Player tracker v2 loaded!")
except Exception as e:
    print(f"⚠️  Player tracker v2 could not load: {e}")
    print("   Player detection will be skipped. To enable it run:")
    print("   python -c \"from ultralytics import YOLO; YOLO('yolov8m-pose.pt')\"")

kalman_smoother = KalmanShuttleSmoother(fps=30)
shot_evaluator  = ShotEvaluator()

# ============================================================
# FASTAPI SETUP
# ============================================================
app = FastAPI(title="Badminton AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# GLOBAL ANALYSIS STATE
# ============================================================
analysis_state = {
    "status": "idle",
    "stage":  "idle",
    "start_time": None,
    "total_frames": 0,
    "processed_frames": 0,
    "eta_seconds": 0,
    "latest_result": None,
}

def update_progress(processed, total, stage=None):
    analysis_state["processed_frames"] = processed
    analysis_state["total_frames"]     = total
    if stage:
        analysis_state["stage"] = stage
    if analysis_state["start_time"] and processed > 0:
        elapsed  = time.time() - analysis_state["start_time"]
        fps_rate = processed / elapsed
        remaining = total - processed
        analysis_state["eta_seconds"] = int(remaining / fps_rate) if fps_rate > 0 else 0
    if processed % 30 == 0:
        print(f"📊 [{analysis_state['stage']}] {processed}/{total} "
              f"({processed / max(total,1) * 100:.1f}%) — ETA: {analysis_state['eta_seconds']}s")

# ============================================================
# ROUTES
# ============================================================
@app.get("/")
def root():
    return {
        "message": "Backend is running",
        "player_tracker": "loaded" if player_tracker_v2 else "not loaded",
    }

@app.get("/analysis-status")
async def get_analysis_status():
    return {
        "status":           analysis_state["status"],
        "stage":            analysis_state["stage"],
        "processed_frames": analysis_state["processed_frames"],
        "total_frames":     analysis_state["total_frames"],
        "eta_seconds":      analysis_state["eta_seconds"],
    }

@app.get("/latest-analysis")
async def get_latest_analysis():
    if analysis_state["latest_result"]:
        return JSONResponse(analysis_state["latest_result"])
    result = AnalysisStorage.get_latest()
    if result:
        return JSONResponse(result)
    return JSONResponse({"error": "No analysis available yet"}, status_code=404)

@app.get("/analysis-results/{analysis_id}")
async def get_analysis_results(analysis_id: str):
    result = AnalysisStorage.get_by_id(analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return JSONResponse(result)

@app.get("/replay-data/{analysis_id}")
async def get_replay_data(analysis_id: str):
    replay_path = os.path.join(OUTPUT_DIR, f"{analysis_id}_replay.json")
    if not os.path.exists(replay_path):
        raise HTTPException(status_code=404, detail="Replay data not found")
    with open(replay_path) as f:
        return JSONResponse(json.load(f))

@app.get("/player-analysis/{analysis_id}")
async def get_player_analysis(analysis_id: str):
    result = AnalysisStorage.get_by_id(analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    tactical = result.get("tactical", {})
    return JSONResponse({
        "heatmaps":      tactical.get("heatmaps", {}),
        "movement":      tactical.get("movement_stats", {}),
        "shot_patterns": tactical.get("shot_patterns", {}),
        "weaknesses":    tactical.get("weaknesses", []),
        "coaching_tips": tactical.get("coaching_tips", []),
    })

app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

# ============================================================
# WEBSOCKET
# ============================================================
active_connections = []

@app.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except:
        active_connections.remove(websocket)

async def send_progress(message: dict):
    for conn in active_connections:
        try:
            await conn.send_json(message)
        except:
            pass

@app.options("/analyze")
async def analyze_options():
    return JSONResponse({"message": "OK"}, headers={
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
    })

# ============================================================
# MAIN ANALYSIS ROUTE
# ============================================================
@app.post("/analyze")
async def analyze_video(
    file: UploadFile = File(...),
    mode: str = "singles",
):
    global analysis_running
    if analysis_running:
        raise HTTPException(status_code=409, detail="Analysis already in progress")

    analysis_running = True
    start_time       = time.time()
    temp_input       = None

    try:
        analysis_state.update({
            "status": "processing", "stage": "starting",
            "start_time": time.time(), "processed_frames": 0,
            "total_frames": 0, "eta_seconds": 0, "latest_result": None,
        })

        # Switch player tracker mode without reloading the model
        if player_tracker_v2 and player_tracker_v2.mode != mode:
            player_tracker_v2.mode = mode
            player_tracker_v2.max_players = 2 if mode == "singles" else 4

        # ── Save uploaded file ───────────────────────────────────
        video_id   = str(uuid.uuid4())
        temp_input = os.path.join(UPLOAD_DIR, f"{video_id}.mp4")
        with open(temp_input, "wb") as f:
            f.write(await file.read())
        print(f"📥 Video saved: {temp_input}")

        # ── Read frames ──────────────────────────────────────────
        frames       = read_video(temp_input)
        total_frames = len(frames)
        analysis_state["total_frames"] = total_frames
        print(f"🎞  Total frames: {total_frames}")

        # ════════════════════════════════════════════════════════
        # STAGE 1 — SHUTTLE DETECTION  (existing, unchanged)
        # ════════════════════════════════════════════════════════
        BATCH_SIZE  = 30
        detections  = []
        batch_times = []
        print("🚀 Stage 1 — Shuttle detection")

        for batch_start in range(0, total_frames, BATCH_SIZE):
            t0        = time.time()
            batch_end = min(batch_start + BATCH_SIZE, total_frames)
            detections.extend(
                shuttle_tracker.detect_shuttle(frames[batch_start:batch_end])
            )
            batch_times.append(time.time() - t0)
            update_progress(batch_end, total_frames, stage="shuttle")

            avg_t     = sum(batch_times) / len(batch_times)
            remaining = (total_frames - batch_end) // BATCH_SIZE
            eta       = remaining * avg_t
            pct       = round(batch_end / total_frames * 100, 1)
            print(f"  {batch_start}–{batch_end}/{total_frames} ({pct}%) ETA {int(eta//60)}m{int(eta%60)}s")
            await send_progress({
                "frame": batch_end, "total": total_frames,
                "percent": pct, "eta_minutes": int(eta // 60),
                "eta_seconds": int(eta % 60), "stage": "shuttle",
            })

        # ── Interpolate then Kalman-smooth ───────────────────────
        detections = shuttle_tracker.interpolate_shuttle_position(detections)

        print("🔧 Stage 2 — Kalman smoothing")
        analysis_state["stage"] = "smoothing"
        kalman_smoother.reset()
        detections = kalman_smoother.smooth_trajectory(detections)
        print("✅ Smoothing done")

        # ════════════════════════════════════════════════════════
        # STAGE 3 — COURT DETECTION
        #
        # FIX 2: court detection now has a clear fallback.
        # If the Hough line detector can't find the court
        # (confidence < 0.5) we skip real-world coordinates
        # and use a simple pixel-to-metres scale based on the
        # frame dimensions.  This means shuttle positions will
        # still appear in the replay — they just won't be
        # perfectly calibrated to real metres until you tune
        # the detector for your camera angle.
        # ════════════════════════════════════════════════════════
        print("🏟  Stage 3 — Court detection")
        analysis_state["stage"] = "court"

        court_detector   = CourtDetector()
        ref_idx          = next(
            (i for i, f in enumerate(frames) if f is not None and f.mean() > 10), 0
        )
        court_homography = court_detector.detect(frames[ref_idx])
        frame_h, frame_w = frames[ref_idx].shape[:2]

        if court_homography.confidence >= 0.5:
            print(f"✅ Court detected — confidence {court_homography.confidence:.2f}")
            use_court_coords = True
        else:
            print(f"⚠️  Court confidence low ({court_homography.confidence:.2f}) — "
                  "using pixel-scale fallback. Replay will still work.")
            use_court_coords = False

        def pixel_to_court_safe(px, py):
            """
            Convert pixel x,y to court metres.
            Uses homography when available, otherwise scales
            by assuming the court fills the full frame.
            Court dimensions: 6.1m wide × 13.4m tall.
            """
            if use_court_coords:
                try:
                    return court_detector.pixel_to_court(px, py)
                except Exception:
                    pass
            # Pixel-scale fallback: normalise to court dimensions
            mx = (px / frame_w) * 6.1
            my = (py / frame_h) * 13.4
            return round(mx, 3), round(my, 3)

        # ════════════════════════════════════════════════════════
        # STAGE 4 — PLAYER TRACKING
        #
        # FIX 1 continued: player_tracker_v2 may be None if the
        # pose model wasn't loaded.  We handle that here by
        # producing an empty player_data list rather than crashing.
        # The rest of the pipeline still runs and produces full
        # shuttle data, metrics, and replay.
        # ════════════════════════════════════════════════════════
        print("🧍 Stage 4 — Player tracking")
        analysis_state["stage"] = "players"
        await send_progress({"frame": 0, "total": total_frames,
                             "percent": 0, "stage": "players"})

        if player_tracker_v2 is not None:
            player_data = player_tracker_v2.detect_video(
                frames, court_detector=court_detector
            )
            detected_player_ids = set()
            for fd in player_data:
                detected_player_ids.update(fd.players.keys())
            print(f"✅ Players detected: {sorted(detected_player_ids)}")
        else:
            # No pose model — produce empty player data so everything
            # downstream still works, just without player dots.
            player_data          = [_empty_frame_data(i) for i in range(total_frames)]
            detected_player_ids  = set()
            print("⚠️  Player tracking skipped (pose model not loaded)")

        await send_progress({"frame": total_frames, "total": total_frames,
                             "percent": 100, "stage": "players"})

        # ── Draw bboxes and save annotated video ─────────────────
        print("🎨 Drawing bounding boxes...")
        analysis_state["stage"] = "drawing"
        output_frames = shuttle_tracker.draw_shuttle_bbox(frames, detections)
        if player_tracker_v2 is not None:
            output_frames = player_tracker_v2.draw_players(output_frames, player_data)

        output_filename = f"{uuid.uuid4()}.mp4"
        output_path     = os.path.join(OUTPUT_DIR, output_filename)
        save_video(output_frames, temp_input, output_path)

        if not os.path.exists(output_path):
            raise RuntimeError("❌ Output video was not saved")
        print(f"🎥 Annotated video saved: {output_path}")

        # ════════════════════════════════════════════════════════
        # STAGE 5 — METRICS + SHOT QUALITY + TACTICAL
        # ════════════════════════════════════════════════════════
        analysis_state["stage"] = "metrics"

        if detections and any(len(d) > 0 for d in detections):
            print("📊 Stage 5 — Computing metrics")

            basic_metrics    = analyze_footwork(detections, fps=30)
            advanced_metrics = compute_advanced_analytics(detections, basic_metrics)
            metrics          = {**basic_metrics, **advanced_metrics}

            print(f"   Stroke counts: {metrics.get('stroke_counts', {})}")

            # ── FIX 3: Wire ShotEvaluator ────────────────────────
            # Build shot_quality_scores from the stroke data that
            # analyze_footwork() already computed.
            # For each frame where a stroke was classified we call
            # ShotEvaluator.evaluate() with:
            #   - stroke type and speed from the classifier
            #   - shuttle landing position in court metres
            #   - opponent position (None for now — gets a neutral score)
            # This produces real 0-100 shot scores for the tactical tab.
            print("⚡ Building shot quality scores...")
            analysis_state["stage"] = "shot_quality"

            shot_quality_list = []   # List[ShotQuality] for TacticalAnalyzer
            shot_events_list  = []   # List[dict] for replay JSON

            # Extract per-frame positions and speeds from basic metrics
            # (analyze_footwork already computed these internally)
            positions  = _extract_positions(detections)
            speeds     = _extract_speeds(positions, fps=30)
            stroke_clf = _reclassify_strokes(positions, speeds)

            for frame_idx, (stroke_type, speed, pos) in enumerate(stroke_clf):
                if stroke_type == "unknown" or speed < 1:
                    continue

                # Convert shuttle position to court metres
                landing_m = None
                if pos is not None:
                    landing_m = pixel_to_court_safe(pos[0], pos[1])

                # Nearest opponent position from player_data
                opponent_m = _nearest_opponent(player_data, frame_idx,
                                               landing_m, pixel_to_court_safe)

                quality = shot_evaluator.evaluate(
                    stroke_type  = stroke_type,
                    speed_km_h   = speed,
                    landing_m    = landing_m,
                    opponent_pos_m = opponent_m,
                )
                shot_quality_list.append(quality)

                shot_events_list.append({
                    "frame":       frame_idx,
                    "stroke_type": quality.stroke_type,
                    "score":       quality.score,
                    "grade":       quality.grade,
                    "speed_km_h":  round(speed, 1),
                    "landing_m":   list(landing_m) if landing_m else None,
                    "explanation": quality.explanation,
                })

            print(f"   Shot events scored: {len(shot_events_list)}")

            # ── FIX 4: Tactical analysis with real shot data ─────
            print("🗺  Running tactical analysis...")
            analysis_state["stage"] = "tactical"

            tactical_analyzer = TacticalAnalyzer()
            tactical_data = tactical_analyzer.analyze(
                player_data   = player_data,
                shot_qualities = shot_quality_list,   # ← now real scores
                rally_data    = [],
                court_w_m     = 6.1,
                court_h_m     = 13.4,
            )
            print(f"   Weaknesses: {len(tactical_data.get('weaknesses', []))}")
            print(f"   Coaching tips: {len(tactical_data.get('coaching_tips', []))}")

            # ── Export replay data ───────────────────────────────
            # FIX 4 continued: shuttle positions always get mx/my
            # now via pixel_to_court_safe(), so the replay canvas
            # will always show the shuttle moving even if court
            # detection was imperfect.
            print("🎬 Exporting replay data...")
            analysis_state["stage"] = "replay"

            court_corners_px = (
                court_homography.corners_px.tolist()
                if use_court_coords and court_homography.corners_px is not None
                else None
            )

            replay_data = export_replay(
                frames_count      = total_frames,
                fps               = 30,
                shuttle_detections = detections,
                player_data       = player_data,
                shot_events       = shot_events_list,
                court_corners_px  = court_corners_px,
            )

            # Patch in court-metre coordinates for shuttle positions
            # that export_replay() left as pixel-only
            for frame_entry in replay_data.get("frames", []):
                sh = frame_entry.get("shuttle")
                if sh and "mx" not in sh:
                    mx, my = pixel_to_court_safe(sh["px"], sh["py"])
                    sh["mx"] = mx
                    sh["my"] = my

            replay_path = os.path.join(OUTPUT_DIR, f"{video_id}_replay.json")
            with open(replay_path, "w") as f:
                json.dump(replay_data, f)
            print(f"💾 Replay saved: {replay_path}")

        else:
            print("⚠️  No shuttle detected in video")
            metrics          = _empty_metrics()
            tactical_data    = _empty_tactical()
            shot_events_list = []
            replay_path      = None

        # ── Persist ──────────────────────────────────────────────
        analysis_state["stage"] = "saving"
        analysis_id = output_filename.split(".")[0]

        AnalysisStorage.save_result(
            analysis_id  = analysis_id,
            metrics      = metrics,
            video_path   = output_path,
            tactical     = tactical_data,
            replay_path  = replay_path,
        )
        print(f"💾 Saved — ID: {analysis_id}")

        # ── Cleanup ───────────────────────────────────────────────
        try:
            if temp_input and os.path.exists(temp_input):
                os.remove(temp_input)
        except Exception as e:
            print(f"⚠️  Temp file cleanup: {e}")

        total_time = time.time() - start_time
        print(f"⏱  Done in {total_time:.1f}s")

        analysis_state.update({
            "status": "done", "stage": "done",
            "eta_seconds": 0, "processed_frames": total_frames,
        })

        response_data = {
            "message":                 "Analysis complete",
            "analysis_id":             analysis_id,
            "video_url":               f"/outputs/{output_filename}",
            "metrics":                 metrics,
            "tactical":                tactical_data,
            "player_ids":              sorted(detected_player_ids),
            "mode":                    mode,
            "shot_events_count":       len(shot_events_list),
            "court_detection":         "calibrated" if use_court_coords else "pixel-scale",
            "player_tracking":         "enabled" if player_tracker_v2 else "disabled",
            "processing_time_seconds": round(total_time, 1),
        }
        analysis_state["latest_result"] = response_data
        return JSONResponse(response_data)

    except Exception as e:
        analysis_state.update({"status": "error", "stage": "error"})
        print("🔥 ANALYSIS ERROR:", str(e))
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        analysis_running = False
        print("✅ Analysis request finished")


# ============================================================
# PIPELINE HELPER FUNCTIONS
# ============================================================

def _extract_positions(detections):
    """Return list of (cx, cy) tuples or None per frame."""
    positions = []
    for det in detections:
        if 0 in det and det[0] is not None:
            x1, y1, x2, y2 = det[0]
            positions.append(((x1 + x2) / 2, (y1 + y2) / 2))
        else:
            positions.append(None)
    return positions


def _extract_speeds(positions, fps=30):
    """Return speed in km/h per frame (0 for first or missing frames)."""
    import math
    PIXELS_TO_METERS = 0.015
    speeds = [0.0]
    for i in range(1, len(positions)):
        if positions[i] and positions[i - 1]:
            dx = positions[i][0] - positions[i - 1][0]
            dy = positions[i][1] - positions[i - 1][1]
            dist_px = math.sqrt(dx * dx + dy * dy)
            speeds.append(dist_px * PIXELS_TO_METERS * fps * 3.6)
        else:
            speeds.append(0.0)
    return speeds


def _reclassify_strokes(positions, speeds):
    """
    Return list of (stroke_type, speed_km_h, position) per frame.
    Uses StrokeClassifier which is already imported by footwork.py.
    """
    import math
    from analysis.stroke_classifier import StrokeClassifier

    result = []
    for i in range(len(positions)):
        pos   = positions[i]
        speed = speeds[i] if i < len(speeds) else 0

        if pos is None or speed < 1:
            result.append(("unknown", 0, None))
            continue

        angle = StrokeClassifier.compute_trajectory_angle(
            positions[i - 1] if i > 0 else None, pos
        )
        h_change = (pos[1] - positions[i - 1][1]) if (i > 0 and positions[i - 1]) else 0
        stroke   = StrokeClassifier.classify_stroke(speed, angle, h_change)
        result.append((stroke, round(speed, 1), pos))

    return result


def _nearest_opponent(player_data, frame_idx, landing_m, pixel_to_court_fn):
    """
    Return the court-metre position of the player farthest from the
    shuttle landing zone (i.e. the defender / opponent).
    Returns None if no player data is available.
    """
    if frame_idx >= len(player_data):
        return None
    fd = player_data[frame_idx]
    if not fd.players:
        return None

    positions_m = []
    for ps in fd.players.values():
        if ps.center_m:
            positions_m.append(ps.center_m)
        elif ps.center_px:
            positions_m.append(pixel_to_court_fn(*ps.center_px))

    if not positions_m or landing_m is None:
        return positions_m[0] if positions_m else None

    # Return the player position farthest from the landing zone
    import math
    return max(
        positions_m,
        key=lambda p: math.sqrt((p[0] - landing_m[0])**2 + (p[1] - landing_m[1])**2)
    )


class _EmptyFrameData:
    """Minimal stand-in for FramePlayerData when pose model is not loaded."""
    def __init__(self, frame_idx):
        self.frame_idx = frame_idx
        self.players   = {}
        self.mode      = "singles"

def _empty_frame_data(frame_idx):
    return _EmptyFrameData(frame_idx)


# ============================================================
# EMPTY DATA HELPERS
# ============================================================
def _empty_metrics():
    return {
        "frames_processed": 0, "detections": 0, "consistency_percent": 0,
        "avg_shuttle_speed_km_h": 0, "max_shuttle_speed_km_h": 0,
        "min_speed_km_h": 0, "speed_variance": 0,
        "avg_rally_length_frames": 0, "avg_rally_length_seconds": 0,
        "total_rallies": 0, "total_distance_meters": 0, "movement_smoothness": 0,
        "stroke_counts": {"smash":0,"clear":0,"drop":0,"net":0,"drive":0,"lift":0},
        "stroke_quality": {
            "smash": {"avg_speed":0,"max_speed":0,"avg_angle":0},
            "drop":  {"net_clearance":0,"accuracy":0},
            "clear": {"avg_apex":0,"depth_percentage":0},
            "drive": {"avg_speed":0,"max_speed":0},
            "lift":  {"avg_angle":0,"consistency":0},
        },
    }

def _empty_tactical():
    return {
        "heatmaps": {}, "movement_stats": {}, "shot_patterns": {},
        "weaknesses": [], "coaching_tips": [],
    }