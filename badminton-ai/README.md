# Badminton AI

Badminton AI is a pure HTML/CSS/JavaScript frontend plus FastAPI backend for match-video analysis, local SQLite persistence, local file storage, and optional AI coaching.

This repo is configured for a completely free deployment stack with no credit card:

- Frontend: Vercel Free (static files)
- Backend: Render Free
- Database: SQLite (ephemeral on Render Free)
- Storage: ephemeral disk on Render Free
- Background jobs: none; analysis runs inline during the upload request
- Optional coaching: deterministic local fallback by default, or OpenRouter free models if you add a free key

**Note:** Render Free tier uses ephemeral storage - files and database changes are lost when the service restarts. For production use, consider upgrading to Render paid tier or using external database/storage services.

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

The frontend is now pure HTML/CSS/JavaScript with no build step. To run it locally, you can use any static file server:

```bash
cd frontend
# Using Python 3
python -m http.server 8000 --directory src

# Or using Node.js http-server (if you have it installed)
npx http-server src -p 8000
```

The frontend will run at `http://localhost:8000`. You can set the API base URL by adding a script tag before your page scripts:

```html
<script>
  window.VITE_API_BASE_URL = "http://localhost:8000/api/v1";
</script>
```

## Deployment

See [backend/RENDER_DEPLOYMENT.md](backend/RENDER_DEPLOYMENT.md) for the backend guide.

For Vercel, deploy from `frontend/src/` as a static site:

- Framework preset: Other
- Build command: (none - static files)
- Output directory: `src`
- Environment variable: You may need to configure the API base URL in your HTML files or via a configuration script

## Free-Service Audit

The production path does not require Docker, Redis, Celery, Postgres, S3, paid object storage, hosted databases, background workers, schedulers, WebSockets, or card-backed cloud services.

OpenRouter is optional. If `OPENROUTER_API_KEY` is blank, coaching reports are generated locally from the analysis results.
