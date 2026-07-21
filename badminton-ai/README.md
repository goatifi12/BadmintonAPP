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

## Status: Production Ready ✅

The application has completed a comprehensive production readiness audit and is now ready for deployment.

### Security & Hardening
- **S3 Storage Backend**: Fully implemented with boto3 for production deployments with separate API/worker processes
- **Rate Limiting**: Applied to all sensitive endpoints (auth: 5-10/min, uploads: 3/min)
- **File Validation**: Magic byte validation for video uploads prevents malicious file uploads
- **HTTPS Enforcement**: Automatic HTTPS redirects in production environment
- **Structured Logging**: Comprehensive request/error logging with structlog
- **Global Error Handling**: Frontend and backend error monitoring
- **Request Timeout**: 5-minute timeout for all API requests
- **Database Indexes**: Optimized queries with composite indexes on analysis_jobs
- **Job Cleanup**: Background tasks for cleaning old/failed jobs
- **Account Settings**: User profile update endpoint implemented

### Deployment Notes
- **Frontend**: Deploy to Vercel using `vercel.json` - handles SPA routing correctly
- **Backend**: 
  - Render: Use `render.yaml` for managed Postgres + Redis + web + worker
  - Fly.io: Use `fly.toml` + `Dockerfile` for single-process or multi-machine deployment
- **Storage**: Set `STORAGE_BACKEND=s3` with `S3_BUCKET` and `S3_REGION` for production
- **Environment**: Set `ENVIRONMENT=production` to enable HTTPS enforcement and production logging
- **JWT Secret**: Must set `JWT_SECRET_KEY` to a secure random value (no default)
- **CORS**: Configure `CORS_ORIGINS` to match your frontend domain

### Required Environment Variables for Production
```
JWT_SECRET_KEY=<secure-random-string>
DATABASE_URL=<postgres-connection-string>
REDIS_URL=<redis-connection-string>
STORAGE_BACKEND=s3
S3_BUCKET=<your-bucket-name>
S3_REGION=<your-region>
CORS_ORIGINS=["https://your-frontend-domain.com"]
ENVIRONMENT=production
OPENROUTER_API_KEY=<optional-for-ai-coaching>
```

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

### Deployment

- Frontend: `vercel deploy` from `frontend/` using `vercel.json`.
- Backend: 
  - Render: Use `render.yaml` (Blueprint deploy) for managed Postgres + Redis + web + worker setup
  - Fly.io: Use `fly.toml` + `Dockerfile` for single-process or multi-machine deployment
- Important: Set `STORAGE_BACKEND=s3` with proper S3 credentials when deploying with separate API/worker processes

## Architecture reference

See the full architecture writeup and phased roadmap discussed before implementation began. Each
phase (foundations, job pipeline skeleton, CV pipeline port, analytics persistence, dashboard UI,
replay player, polish) is implemented and reviewed one at a time. Phases 1–6 are done.
