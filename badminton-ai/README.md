# Badminton AI

Badminton AI is a Vite frontend plus FastAPI backend for match-video analysis, local SQLite persistence, local file storage, and optional AI coaching.

This repo is configured for a completely free deployment stack with no credit card:

- Frontend: Vercel Free
- Backend: PythonAnywhere Free
- Database: SQLite file on PythonAnywhere
- Storage: local files on PythonAnywhere
- Background jobs: none; analysis runs inline during the upload request
- Optional coaching: deterministic local fallback by default, or OpenRouter free models if you add a free key

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The backend runs at `http://localhost:8000`. Health check: `GET /health`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The frontend runs at `http://localhost:5173` and uses `VITE_API_BASE_URL` for API calls.

## Deployment

See [backend/PYTHONANYWHERE_DEPLOYMENT.md](backend/PYTHONANYWHERE_DEPLOYMENT.md) for the backend guide.

For Vercel, deploy from `frontend/` with:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://your-pythonanywhere-username.pythonanywhere.com/api/v1`

## Free-Service Audit

The production path does not require Docker, Redis, Celery, Postgres, S3, paid object storage, hosted databases, background workers, schedulers, WebSockets, or card-backed cloud services.

OpenRouter is optional. If `OPENROUTER_API_KEY` is blank, coaching reports are generated locally from the analysis results.
