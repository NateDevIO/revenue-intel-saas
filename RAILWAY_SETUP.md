# Railway Quick Setup Guide

## 🚂 Deploy Backend to Railway in 5 Minutes

### Step 1: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose: `NateDevIO/revenue-intel-saas`

### Step 2: Configure Service

Railway will auto-detect the configuration, but verify:

1. Click on your service
2. **Settings** tab:
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

### Step 3: Generate Public URL

1. **Settings** → **Networking**
2. Click **"Generate Domain"**
3. **Copy the URL** (e.g., `https://revenue-intel-saas-production.up.railway.app`)

### Step 4: (Optional) Add AI Features

If you want AI-powered customer insights:

1. Get API key from: https://console.anthropic.com/
2. **Variables** tab
3. Add variable:
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: `sk-ant-...`

### Step 5: Verify Deployment

Visit: `https://your-backend.railway.app/api/health`

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "tables": 10,
  "total_records": 60000
}
```

### ✅ Done!

Your backend is live. Use this URL for the Vercel frontend:
- Copy URL from Railway
- Add to Vercel as `NEXT_PUBLIC_API_URL`

---

## Configuration Files

This repository includes:

- ✅ `backend/Dockerfile` - Container configuration
- ✅ `backend/railway.toml` - Railway deployment settings
- ✅ `backend/.dockerignore` - Build optimization

Railway will automatically use these files.

---

## Troubleshooting

**Build fails?**
- Check **Deployments** → **View Logs**
- Common issue: Missing dependencies in `requirements.txt`

**Database empty?**
- Dockerfile runs `python -m data.generator` automatically
- Check logs to verify completion

**App crashes?**
- Check that `PORT` environment variable is used (Railway sets this automatically)
- Verify `uvicorn` starts on `0.0.0.0:$PORT`

---

## Next Steps

1. Deploy frontend to Vercel ([see DEPLOYMENT.md](DEPLOYMENT.md))
2. Connect frontend to Railway backend
3. Set up custom domain (optional)

**Questions?** Check the full [DEPLOYMENT.md](DEPLOYMENT.md) guide.
