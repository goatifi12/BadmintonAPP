# PythonAnywhere Free Deployment

This backend is configured for PythonAnywhere Free without a credit card. The frontend is now pure HTML/CSS/JavaScript with no build step.

## What Runs In Production

- WSGI entrypoint: `wsgi.py`
- App framework: FastAPI through `a2wsgi`
- Database: SQLite
- Storage: local files under `LOCAL_STORAGE_DIR`
- Job processing: inline during upload requests
- Background workers: none
- External paid services: none
- Frontend: Pure HTML/CSS/JavaScript static files (deployed separately to Vercel or similar)

PythonAnywhere Free has CPU, disk, and request-time limits. Keep uploaded clips short and set a conservative `MAX_UPLOAD_BYTES`.

## 1. Upload The Code

From a PythonAnywhere Bash console:

```bash
git clone https://github.com/goatifi12/BadmintonAPP
cd ~/BadmintonAPP/badminton-ai/backend
```

## 2. Create A Virtualenv

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

**If you get a disk quota exceeded error:**

The PythonAnywhere free tier has limited disk space. If installation fails, clean up and try again:

```bash
# Delete the failed installation
rm -rf .venv

# Clean pip cache
pip cache purge

# Recreate virtualenv with smaller packages
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

The `requirements.txt` has been optimized for PythonAnywhere's disk limits by:
- Using `uvicorn` instead of `uvicorn[standard]` (removes extra dependencies)
- Removing test dependencies (pytest, httpx)
- Using older, smaller versions of opencv and numpy
- Removing duplicate bcrypt dependency

## 3. Configure Environment Variables

In the PythonAnywhere web app environment variable UI, or in the generated WSGI config, set:

```bash
APP_NAME=Badminton AI
ENVIRONMENT=production
CORS_ORIGINS=https://your-vercel-app.vercel.app
DATABASE_URL=sqlite+aiosqlite:////home/YOUR_PYTHONANYWHERE_USERNAME/BadmintonAPP/badminton-ai/backend/data/badminton.db
JWT_SECRET_KEY=replace-with-a-secure-random-secret
LOCAL_STORAGE_DIR=/home/YOUR_PYTHONANYWHERE_USERNAME/BadmintonAPP/badminton-ai/backend/data/uploads
PROCESS_JOBS_INLINE=true
MAX_UPLOAD_BYTES=104857600
AUTO_CREATE_TABLES=true
OPENROUTER_API_KEY=
OPENROUTER_SITE_URL=https://your-vercel-app.vercel.app
OPENROUTER_APP_NAME=Badminton AI
```

Generate a JWT secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 4. Create The Web App

1. Go to PythonAnywhere `Web`.
2. Add a new manual web app.
3. Choose Python 3.12.
4. Set source code and working directory to:

```text
/home/YOUR_PYTHONANYWHERE_USERNAME/BadmintonAPP/badminton-ai/backend
```

5. Set the virtualenv to:

```text
/home/YOUR_PYTHONANYWHERE_USERNAME/BadmintonAPP/badminton-ai/backend/.venv
```

6. Edit the PythonAnywhere WSGI file and use:

```python
import os
import sys

project_home = "/home/YOUR_PYTHONANYWHERE_USERNAME/BadmintonAPP/badminton-ai/backend"
if project_home not in sys.path:
    sys.path.insert(0, project_home)

os.environ["APP_NAME"] = "Badminton AI"
os.environ["ENVIRONMENT"] = "production"
os.environ["CORS_ORIGINS"] = "https://your-vercel-app.vercel.app"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:////home/YOUR_PYTHONANYWHERE_USERNAME/BadmintonAPP/badminton-ai/backend/data/badminton.db"
os.environ["JWT_SECRET_KEY"] = "replace-with-a-secure-random-secret"
os.environ["LOCAL_STORAGE_DIR"] = "/home/YOUR_PYTHONANYWHERE_USERNAME/BadmintonAPP/badminton-ai/backend/data/uploads"
os.environ["PROCESS_JOBS_INLINE"] = "true"
os.environ["MAX_UPLOAD_BYTES"] = "104857600"
os.environ["AUTO_CREATE_TABLES"] = "true"
os.environ["OPENROUTER_API_KEY"] = ""
os.environ["OPENROUTER_SITE_URL"] = "https://your-vercel-app.vercel.app"
os.environ["OPENROUTER_APP_NAME"] = "Badminton AI"

from wsgi import application
```

7. Reload the web app.

Tables are created automatically on startup when `AUTO_CREATE_TABLES=true`.

## 5. Verify The Backend

Open:

```text
https://YOUR_PYTHONANYWHERE_USERNAME.pythonanywhere.com/health
```

Expected response:

```json
{"status":"ok","service":"Badminton AI","database":"connected"}
```

## 6. Connect Vercel

In Vercel, set:

```bash
VITE_API_BASE_URL=https://YOUR_PYTHONANYWHERE_USERNAME.pythonanywhere.com/api/v1
```

Then set `CORS_ORIGINS` on PythonAnywhere to the exact Vercel production URL.

## Free-Only Confirmation

Required services:

- PythonAnywhere Free: no credit card required
- Vercel Free: no credit card required
- SQLite: local open-source database
- Local filesystem storage: included with PythonAnywhere account

Optional service:

- OpenRouter free models: optional, can be left disabled. The app works with local coaching fallback.

Do not add S3, Redis, Celery workers, managed Postgres, Docker hosting, always-on tasks, schedulers, or paid analytics for this deployment target.
