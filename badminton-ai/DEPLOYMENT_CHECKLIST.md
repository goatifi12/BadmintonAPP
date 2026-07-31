# Deployment Checklist: Vercel Frontend + Render Backend

This checklist ensures your Badminton AI application works correctly when deployed to Vercel (frontend) and Render (backend).

## Pre-Deployment Checklist

### Backend (Render)

- [ ] **Update CORS Configuration**
  - Edit `backend/app/core/config.py`
  - Set `cors_origins` to include your Vercel domain: `["https://your-app.vercel.app"]`
  - Example: `cors_origins: list[str] = ["https://your-app.vercel.app", "http://localhost:5173"]`

- [ ] **Configure Environment Variables in Render**
  - Set `CORS_ORIGINS=https://your-app.vercel.app`
  - Set `ENVIRONMENT=production`
  - Set `JWT_SECRET_KEY` to a secure random string
  - Set `DATABASE_URL=sqlite+aiosqlite:///./badminton.db`
  - Set `LOCAL_STORAGE_DIR=./data/uploads`
  - Set `PROCESS_JOBS_INLINE=true`
  - Set `MAX_UPLOAD_BYTES` appropriately (e.g., `104857600` for 100MB)
  - Set `AUTO_CREATE_TABLES=true` for first deployment
  - Optional: Set `OPENROUTER_API_KEY` for AI coaching features

- [ ] **Deploy Backend**
  - Follow `backend/RENDER_DEPLOYMENT.md`
  - Test backend health: `https://your-backend.onrender.com/health`
  - Note your backend URL for frontend configuration

### Frontend (Vercel)

- [ ] **Update API Configuration**
  - Edit `frontend/src/config.js`
  - Replace `https://your-backend.onrender.com/api/v1` with your actual backend URL
  - The script should look like:
    ```javascript
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      apiBaseUrl = 'http://localhost:8000/api/v1';
    } else {
      apiBaseUrl = 'https://your-backend.onrender.com/api/v1';
    }
    ```

- [ ] **Deploy to Vercel**
  - Connect your GitHub repository to Vercel
  - Set root directory to `frontend/src` (not `frontend`)
  - Framework preset: "Other" (no build step needed)
  - Build command: leave empty
  - Output directory: `.` (current directory)
  - No environment variables needed (API URL is in config.js)

## Post-Deployment Testing

### Authentication Flow

- [ ] **Test Registration**
  - Navigate to `https://your-app.vercel.app/pages/register/index.html`
  - Create a new account
  - Verify redirect to dashboard after successful registration
  - Check browser console for errors

- [ ] **Test Login**
  - Navigate to `https://your-app.vercel.app/pages/login/index.html`
  - Sign in with registered credentials
  - Verify redirect to dashboard
  - Check that user email appears in navigation

- [ ] **Test Session Persistence**
  - Refresh the dashboard page
  - Verify you stay logged in (JWT token in localStorage)
  - Navigate to settings page
  - Verify profile information displays correctly

### File Upload Flow

- [ ] **Test Video Upload**
  - Navigate to upload page
  - Select a small test video file (< 10MB for testing)
  - Choose match type (singles/doubles)
  - Submit upload
  - Verify redirect to processing page
  - Check browser network tab for successful API call

- [ ] **Test Processing Page**
  - Verify progress bar updates
  - Verify stage label changes (queued → processing → done)
  - Wait for completion or test with a quick-processing video
  - Verify redirect to results page when done

### Results & Analysis

- [ ] **Test Results Page**
  - Verify KPIs display (avg speed, max speed, shots, rallies)
  - Verify charts render (shot counts, shot mix)
  - Verify heatmaps load for both players
  - Verify coaching report section loads
  - Verify shot log table populates

- [ ] **Test Replay Page**
  - Click "Open interactive replay" from results
  - Verify video loads
  - Test playback controls (play/pause, step forward/back)
  - Test speed selection
  - Verify court visualization shows player/shuttle positions
  - Verify shot markers on timeline

### Navigation & UI

- [ ] **Test Navigation**
  - Verify all nav links work (Dashboard, Upload, Reports, Settings)
  - Verify "Sign out" redirects to login page
  - Verify brand logo redirects to landing page
  - Test back button behavior

- [ ] **Test Responsive Design**
  - Test on mobile viewport
  - Verify layout adapts correctly
  - Test touch interactions on mobile

### Error Handling

- [ ] **Test Error States**
  - Try uploading an invalid file type
  - Try uploading a file that's too large
  - Test with invalid credentials
  - Test with expired JWT token
  - Verify appropriate error messages display

## Troubleshooting

### Common Issues

**CORS Errors**
- Symptom: Network errors in browser console, requests blocked
- Solution: Verify `CORS_ORIGINS` in backend includes your Vercel domain
- Check: Render logs should show CORS configuration

**API Connection Errors**
- Symptom: "Could not reach the server" messages
- Solution: Verify `config.js` has correct backend URL
- Check: Backend health endpoint is accessible

**Authentication Failures**
- Symptom: Redirects to login unexpectedly
- Solution: Verify JWT_SECRET_KEY matches between environments
- Check: Browser localStorage contains valid token

**File Upload Failures**
- Symptom: Upload fails with timeout or error
- Solution: Verify MAX_UPLOAD_BYTES is sufficient
- Check: Render resource limits (512MB RAM on free tier)

**Render Cold Start**
- Symptom: First request takes 30-60 seconds
- Solution: Normal on Render Free tier - service spins down after inactivity
- Consider upgrading to paid tier for consistent performance

**Chart.js Not Loading**
- Symptom: Charts don't render on results page
- Solution: Verify chart.js is in package.json and installed
- Check: Browser console for chart.js errors

## Performance Considerations

### Render Free Tier Limits

- **Ephemeral Storage:** Files and database are lost on service restart
- **Cold Starts:** Service spins down after 15 minutes inactivity (30-60s cold start)
- **Resource Limits:** 512MB RAM, 0.1 CPU
- **Bandwidth:** 10GB per month
- **Video Processing:** May exceed RAM limits for large videos
- **Solution:** Set conservative MAX_UPLOAD_BYTES (e.g., 50-100MB)
- **Recommendation:** Upgrade to paid tier ($7/month) for production use

### Vercel Limits

- Static file serving: No issues with current setup
- Bandwidth: Monitor if video downloads become heavy
- Solution: Consider CDN for large video files if needed

## Security Checklist

- [ ] **HTTPS Enforcement**
  - Backend: `ENVIRONMENT=production` enables HTTPS redirect
  - Frontend: Vercel provides HTTPS automatically
  - Verify all API calls use HTTPS in production

- [ ] **JWT Security**
  - JWT_SECRET_KEY is strong and unique
  - Token expiration times are appropriate (24h access, 14d refresh)
  - Tokens are stored in localStorage (acceptable for this use case)

- [ ] **File Upload Security**
  - File type validation on backend
  - File size limits enforced
  - Upload directory is not publicly accessible

- [ ] **Environment Variables**
  - No sensitive data in frontend code
  - API keys not exposed in browser
  - Production secrets not in git repository

## Monitoring & Maintenance

### Backend Monitoring

- [ ] Check PythonAnywhere error logs regularly
- [ ] Monitor disk space usage in upload directory
- [ ] Monitor database size
- [ ] Set up alerts for API errors

### Frontend Monitoring

- [ ] Monitor Vercel deployment logs
- [ ] Check browser console for client-side errors
- [ ] Monitor user-reported issues

### Regular Maintenance

- [ ] Clean up old uploaded files periodically
- [ ] Archive old database records if needed
- [ ] Update dependencies regularly
- [ ] Review and update CORS origins as needed

## Rollback Plan

If deployment fails:

1. **Backend Rollback**
   - Revert to previous git commit on PythonAnywhere
   - Reload web app
   - Verify health endpoint

2. **Frontend Rollback**
   - Revert git commit
   - Vercel will auto-deploy previous version
   - Verify functionality

## Success Criteria

Deployment is successful when:

- ✅ Users can register and log in
- ✅ Users can upload videos successfully
- ✅ Processing completes and redirects to results
- ✅ Results page displays all KPIs and charts
- ✅ Replay page loads and functions correctly
- ✅ Navigation works across all pages
- ✅ No console errors in production
- ✅ CORS requests succeed without errors
- ✅ Mobile responsive design works
