import os
import sys
import uuid
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from analysis_storage import AnalysisStorage

# ============================================================
# PATH SETUP
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
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
from analysis.footwork import analyze_footwork  # Now includes stroke classification!

# ============================================================
# MODEL PATH
# ============================================================
MODEL_PATH = os.path.join(
    PROJECT_DIR,
    "badminton_model",
    "train",
    "shuttle_output",
    "models",
    "weights",
    "best.pt"
)

if not os.path.isfile(MODEL_PATH):
    raise FileNotFoundError(f"❌ Model not found at: {MODEL_PATH}")

# ============================================================
# LOAD MODEL
# ============================================================
print("🚀 Loading shuttle tracker model...")
shuttle_tracker = ShuttleTracker(MODEL_PATH)
print("✅ Model loaded successfully!")

# ============================================================
# FASTAPI SETUP
# ============================================================
app = FastAPI(title="Badminton Shuttle Tracker API")

# CORS MUST BE FIRST
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

# ============================================================
# ROUTES
# ============================================================
@app.get("/")
def root():
    return {"message": "Backend is running", "cors": "enabled"}

@app.options("/analyze")
async def analyze_options():
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.get("/latest-analysis")
async def get_latest_analysis():
    """Get latest analysis for chat consumption"""
    result = AnalysisStorage.get_latest()
    if result:
        return JSONResponse(result)
    else:
        return JSONResponse(
            {"error": "No analysis available yet"},
            status_code=404
        )

@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    print("🚀 Analysis started")
    global analysis_running

    if analysis_running:
        return JSONResponse({
            "message": "Analysis already in progress. Please wait.",
            "error": "concurrent_analysis"
        }, status_code=409)

    analysis_running = True

    try:
        # Save uploaded video
        temp_input = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}.mp4")
        with open(temp_input, "wb") as f:
            f.write(await file.read())

        print("📥 Uploaded video saved:", temp_input)

        # Read + analyze video
        frames = read_video(temp_input)
        frames = frames[:300]  # Limit to 300 frames for faster processing

        if not frames:
            raise RuntimeError("❌ No frames read from video")

        print(f"🎞 Frames read: {len(frames)}")

        # SHUTTLE DETECTION
        detections = shuttle_tracker.detect_shuttle(frames)
        detections = shuttle_tracker.interpolate_shuttle_position(detections)

        print("📊 Detections per frame:", [len(d) for d in detections])

        # DRAW BOUNDING BOXES
        output_frames = shuttle_tracker.draw_shuttle_bbox(frames, detections)

        # Save output video
        output_filename = f"{uuid.uuid4()}.mp4"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        save_video(output_frames, temp_input, output_path)

        if not os.path.exists(output_path):
            raise RuntimeError("❌ Output video was not saved")

        print("🎥 Output video saved to:", output_path)

        # ============================================================
        # COMPUTE METRICS (NOW INCLUDES STROKE CLASSIFICATION!)
        # ============================================================
        if detections and any(len(d) > 0 for d in detections):
            metrics = analyze_footwork(detections, fps=30)
            print("✅ Metrics computed with stroke classification!")
            print(f"   Strokes detected: {metrics.get('stroke_counts', {})}")
        else:
            print("⚠️ No shuttle detected in entire video")
            metrics = {
                "frames_processed": len(frames),
                "detections": 0,
                "consistency_percent": 0,
                "avg_shuttle_speed_km_h": 0,
                "max_shuttle_speed_km_h": 0,
                "min_speed_km_h": 0,
                "speed_variance": 0,
                "avg_rally_length_frames": 0,
                "avg_rally_length_seconds": 0,
                "total_rallies": 0,
                "total_distance_meters": 0,
                "movement_smoothness": 0,
                # Empty stroke data
                "stroke_counts": {
                    "smash": 0,
                    "clear": 0,
                    "drop": 0,
                    "net": 0,
                    "drive": 0,
                    "unknown": 0
                },
                "stroke_quality": {
                    "smash": {"count": 0, "avg_speed": 0, "max_speed": 0, "avg_angle": 0},
                    "drop": {"count": 0, "net_clearance": 0, "accuracy": 0},
                    "clear": {"count": 0, "avg_apex": 0, "depth_percentage": 0}
                }
            }

        # Store results for chat
        analysis_id = output_filename.split('.')[0]
        AnalysisStorage.save_result(
            analysis_id=analysis_id,
            metrics=metrics,
            video_path=output_path
        )
        print(f"💾 Analysis results saved with ID: {analysis_id}")

        # Cleanup uploaded file
        try:
            os.remove(temp_input)
        except Exception:
            pass

        # Build response
        response_data = {
            "message": "Analysis complete",
            "analysis_id": analysis_id,
            "video_url": f"/outputs/{output_filename}",
            "metrics": metrics
        }
        
        print("✅ Sending response with stroke data:")
        print(f"   Total strokes: {sum(metrics.get('stroke_counts', {}).values())}")
        
        return JSONResponse(response_data)

    except Exception as e:
        print("🔥 ANALYSIS ERROR:", str(e))
        import traceback
        traceback.print_exc()
        
        error_response = {
            "message": f"Analysis failed: {str(e)}",
            "video_url": None,
            "metrics": {
                "frames_processed": 0,
                "detections": 0,
                "consistency_percent": 0,
                "avg_shuttle_speed_km_h": 0,
                "max_shuttle_speed_km_h": 0,
                "stroke_counts": {},
                "stroke_quality": {}
            },
            "error": str(e)
        }
        
        print("❌ Sending error response:", error_response)
        
        return JSONResponse(error_response, status_code=500)
    
    finally:
        analysis_running = False
        print("✅ Analysis finished")