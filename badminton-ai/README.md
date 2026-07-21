# Badminton AI — rebuild

> ## ⚠️ Do not open the HTML files by double-clicking them
> This is a real web app with a backend — it needs to be **served**, not opened as a local file.
> Double-clicking `index.html` (or any page) opens it as `file://...`, and browsers block the
> scripts a modern web app needs under that protocol. If you do this anyway, the app now shows an
> on-screen warning explaining it — but the fix is simply:
> ```bash
> cd frontend
> npm install
> npm run dev
> ```
> then open **http://localhost:5173** in your browser. See "Running it" below for the backend too —
> both need to be running for anything (including creating an account or uploading a video) to work.

A ground-up rebuild of the badminton match-analysis app: FastAPI + Postgres + Celery/Redis backend,
vanilla HTML/CSS/TypeScript frontend (Vite-bundled, no framework). See the original project's
`TRAINING_AND_EVALUATION.md`-era pipeline for feature inspiration — this repo is a clean-room
re-architecture, not a port.

## Status: Phase 6 — Replay player + deployment configs ✅

Phases 1–5 (auth, job pipeline skeleton, real CV pipeline, analytics persistence + AI coaching,
dashboard UI) are still in place and passing. New in Phase 6:

- **A dedicated replay player** (`/replay?jobId=`), reached from a new "Open interactive replay" button
  on the results page:
  - the annotated video with play/pause, frame-step (±1 frame, computed from the replay's actual fps),
    and a playback-speed selector (0.25×–2×)
  - a scrubbable timeline with a marker per detected shot; click a marker (or a row in the shot list)
    to jump straight to that moment, paused
  - a live top-down court minimap (SVG, drawn directly in court-meters as its `viewBox` so no extra
    coordinate scaling math is needed) showing both players and the shuttle, updated on every
    `timeupdate` by looking up the matching frame in the replay JSON
  - a shot list in the side panel that highlights whichever shot is currently active as the video plays
- **Deployment configs**: `frontend/vercel.json` for the static frontend build; `backend/render.yaml`
  (web service + separate Celery worker + managed Postgres + managed Redis) and `backend/fly.toml` +
  `backend/Dockerfile` as an alternative. These are written to match how the app is actually configured
  (env vars, start commands, migration-on-release) but **are unverified** — this sandbox has no Docker
  and no access to Render/Fly, so I couldn't actually deploy and test them. Worth a real trial deploy
  before relying on them.
- **One honest limitation surfaced by writing the deployment configs**: running the API and the Celery
  worker as two separate services (as `render.yaml` does, and as real production use would want) means
  local-disk storage isn't shared between them — the worker writes pipeline outputs to its own disk,
  which the API process serving `/jobs/{id}/video` etc. can't see. The storage abstraction
  (`app/core/storage.py`) already has an `S3StorageBackend` interface stubbed out for exactly this
  reason; it just isn't implemented yet. Noted directly in `render.yaml` and `fly.toml` rather than
  glossed over.

Verified live, not just via the build: all 10 pages build and return 200 served alongside a live
backend. For the replay page specifically, I wrote a Node script that replays its exact data-fetching
sequence (job status → replay JSON + annotated video blob in parallel) against a live backend with a
real generated video, and independently re-ran its frame-lookup and court-coordinate math
(`frameForTime`, and the `mx/COURT_WIDTH_M * 61` mapping the SVG minimap uses) to confirm the computed
SVG coordinates land inside the `viewBox` bounds and both player teams resolve correctly for a real
detected frame — the same kind of "prove the frontend's assumptions match live backend output" check
used in Phase 5, extended to the coordinate math a screenshot-only review can't verify. All 41 backend
tests still pass unchanged, since this phase touched frontend and deployment config only.

Not built yet: account settings mutations (still no `PATCH /users/me`), and the deployment configs are
unverified as noted above. With this, every feature from the original roadmap phases 1–6 is in place;
remaining work is production hardening (S3 storage, verified deployment, rate limiting, etc.) rather
than new features.

## Running it

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m alembic upgrade head     # creates badminton_dev.db (SQLite) by default
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Health check: `GET /health`.

To enable real AI coaching instead of the deterministic fallback: get a free API key at
[openrouter.ai/keys](https://openrouter.ai/keys) (no credit card required) and set
`OPENROUTER_API_KEY` in `backend/.env`.

To use Postgres + a real Celery worker instead of the SQLite/eager-mode defaults:

```bash
docker compose up -d postgres redis
# in backend/.env:
# DATABASE_URL=postgresql+asyncpg://badminton:badminton@localhost:5432/badminton
# CELERY_TASK_ALWAYS_EAGER=false
python -m alembic upgrade head
celery -A app.workers.celery_app worker --loglevel=info   # separate terminal
uvicorn app.main:app --reload
```

Run tests:

```bash
cd backend
python -m pytest -q
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs at `http://localhost:5173`. It talks to the backend at
`http://localhost:8000/api/v1` by default (override with `VITE_API_BASE_URL`).

Production build:

```bash
npm run build     # outputs to frontend/dist, one HTML entry per page
```

Pages: `/` (landing), `/src/pages/login`, `/src/pages/register`, `/src/pages/dashboard`,
`/src/pages/upload`, `/src/pages/processing?jobId=`, `/src/pages/reports`,
`/src/pages/results?jobId=`, `/src/pages/replay?jobId=`, `/src/pages/settings`.

### Deployment (unverified — see caveat above)

- Frontend: `vercel deploy` from `frontend/` using `vercel.json`.
- Backend: `render.yaml` (Blueprint deploy) for a managed Postgres + Redis + web + worker setup, or
  `fly.toml` + `Dockerfile` for Fly.io (single-process; see the comments in `fly.toml` for adding a
  separate worker machine). Either way, switch `STORAGE_BACKEND` to `s3` and implement
  `S3StorageBackend` first if the API and worker run as separate processes/machines.

## Architecture reference

See the full architecture writeup and phased roadmap discussed before implementation began. Each
phase (foundations, job pipeline skeleton, CV pipeline port, analytics persistence, dashboard UI,
replay player, polish) is implemented and reviewed one at a time. Phases 1–6 are done.
