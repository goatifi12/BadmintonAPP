# Badminton AI

A badminton coaching platform built with FastAPI, vanilla HTML/CSS/JavaScript, Chart.js, and a production-oriented computer-vision backend.

The frontend UI is intentionally preserved. The backend now exposes a modular analysis pipeline with court calibration, player tracking, shuttle tracking, temporal shot classification, analytics, heatmap exports, SQLite persistence, and OpenAI coaching integration with a local fallback.

## Production Pipeline

- `pipeline/video_io.py`: video metadata and frame inspection.
- `pipeline/court_calibration.py`: court homography adapter for learned court-line/keypoint models.
- `pipeline/orchestrator.py`: end-to-end job orchestration and compatibility response assembly.
- `pipeline/shots.py`: temporal shot-event features and classifier contract.
- `pipeline/analytics.py`: rally, movement, shot, quality, and heatmap analytics.
- `pipeline/heatmaps.py`: normalized heatmap grids and PNG exports.
- `pipeline/coaching.py`: OpenAI code-interpreter-style coaching report generation with deterministic fallback.
- `pipeline/persistence.py`: SQLite tables for analyses, artifacts, shot events, player tracks, and coaching reports.

Set `BADMINTON_PLAYER_WEIGHTS`, `BADMINTON_SHUTTLE_WEIGHTS`, and optionally `BADMINTON_COURT_WEIGHTS` to enable the GPU detector-ready path. Without weights, the app remains runnable through the compatibility tracking adapter.

Set `ROBOFLOW_API_KEY` to use hosted Roboflow serverless models instead of local weights:

- `ROBOFLOW_PLAYER_MODEL_ID=badminton-player-tracking/2`
- `ROBOFLOW_SHUTTLE_MODEL_ID=badminton-shuttlecocks/1`
- `ROBOFLOW_SHOT_MODEL_ID=badminton-shot-classification-x1nb5/1`
- `ROBOFLOW_API_URL=https://serverless.roboflow.com`

Roboflow player/shuttle detection is attempted before local YOLO weights. Roboflow shot classification runs on detected shot/contact frames after temporal shot-event detection. If Roboflow is unavailable, the pipeline falls back to local weights or temporal/compatibility tracking unless `ROBOFLOW_REQUIRED=1`.

Set `OPENAI_API_KEY` to enable OpenAI-generated coaching reports.

## API Additions

- `POST /analysis-jobs`
- `GET /analysis-jobs/{id}`
- `GET /analysis-results/{id}/shots`
- `GET /analysis-results/{id}/heatmaps/{type}.png`
- `POST /analysis-results/{id}/coaching`

## Run Locally

```bash
cd BadmintonAI/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Then open the frontend:

```bash
python -m http.server 3000 --directory BadmintonAI/frontend
```

Visit `http://127.0.0.1:3000`.
