# Render Free Deployment

This backend is configured for Render Free without a credit card.

## What Runs In Production

- App framework: FastAPI through uvicorn
- Database: SQLite (ephemeral on Render Free)
- Storage: ephemeral disk storage on Render Free
- Job processing: inline during upload requests
- Background workers: none
- External paid services: none
- Frontend: Pure HTML/CSS/JavaScript static files (deployed separately to Vercel or similar)

**Important:** Render Free tier uses ephemeral storage. Files and database changes are lost when the service restarts. For production use, consider upgrading to Render paid tier or using external database/storage services.

## Prerequisites

- GitHub account with the BadmintonAPP repository
- Render account (free tier)

## 1. Prepare Your Repository

Ensure your repository is on GitHub:
```
https://github.com/goatifi12/BadmintonAPP
```

## 2. Create Render Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub account and select the `BadmintonAPP` repository
4. Configure the service:

**Build & Deploy:**
- **Root Directory:** `badminton-ai/backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Environment Variables:**
Add these in the Environment section:

```bash
APP_NAME=Badminton AI
ENVIRONMENT=production
CORS_ORIGINS=https://your-vercel-app.vercel.app
DATABASE_URL=sqlite+aiosqlite:///./badminton.db
JWT_SECRET_KEY=generate-a-secure-random-secret-here
LOCAL_STORAGE_DIR=./data/uploads
PROCESS_JOBS_INLINE=true
MAX_UPLOAD_BYTES=104857600
AUTO_CREATE_TABLES=true
OPENROUTER_API_KEY=
OPENROUTER_SITE_URL=https://your-vercel-app.vercel.app
OPENROUTER_APP_NAME=Badminton AI
```

**Important:** Replace `https://your-vercel-app.vercel.app` with your actual Vercel frontend URL.

## 3. Deploy

Click "Create Web Service". Render will:
- Clone your repository
- Install dependencies from requirements.txt
- Start the FastAPI application
- Provide a URL like `https://badminton-ai-backend.onrender.com`

## 4. Note Your Backend URL

After deployment, Render will provide a URL. Copy this URL - you'll need it for:
- Frontend configuration (`frontend/src/config.js`)
- CORS configuration (already set in environment variables)

Example: `https://badminton-ai-backend.onrender.com`

## 5. Update Frontend Configuration

Edit `frontend/src/config.js`:

```javascript
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  apiBaseUrl = 'http://localhost:8000/api/v1';
} else {
  apiBaseUrl = 'https://badminton-ai-backend.onrender.com/api/v1';
}
```

## Render Free Tier Limitations

**Ephemeral Storage:**
- Files uploaded to `LOCAL_STORAGE_DIR` are lost when the service restarts
- SQLite database is reset on service restart
- Render spins down free services after 15 minutes of inactivity
- Cold start can take 30-60 seconds

**Resource Limits:**
- 512MB RAM
- 0.1 CPU
- 10GB bandwidth per month
- No background workers

**For Production Use:**
Consider upgrading to Render paid tier ($7/month) for:
- Persistent disk storage
- Better performance
- No spin-down
- More CPU/RAM

## Alternative: Use External Services

For a more robust free deployment, consider:

**Database:** Replace SQLite with Supabase (free PostgreSQL)
**Storage:** Replace local storage with Supabase Storage or Cloudflare R2

This would require code changes to use external services instead of local files.

## Health Check

After deployment, test the health endpoint:
```
https://your-backend-url.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "service": "Badminton AI",
  "database": "connected"
}
```

## Troubleshooting

**Build Fails:**
- Check Render build logs
- Ensure requirements.txt is in the root directory
- Verify Python version (Render uses Python 3.9+ by default)

**Service Won't Start:**
- Check start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Verify environment variables are set
- Check application logs for errors

**CORS Errors:**
- Ensure CORS_ORIGINS includes your Vercel domain
- Check frontend config.js uses correct backend URL

**Video Processing Fails:**
- Ensure opencv-python-headless is in requirements.txt
- Check RAM usage - video processing may exceed 512MB limit
- Consider upgrading to paid tier for better performance
