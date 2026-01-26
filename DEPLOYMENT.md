# Deployment Guide

This guide covers deploying the SaaS Revenue Intelligence Platform using Railway (backend) and Vercel (frontend).

## 🎯 Architecture

```
┌─────────────┐         ┌──────────────┐
│   Vercel    │────────▶│   Railway    │
│  (Frontend) │  HTTPS  │  (Backend)   │
│  Next.js 14 │         │  FastAPI     │
└─────────────┘         │  + DuckDB    │
                        └──────────────┘
```

## Prerequisites

- [x] GitHub account
- [x] Railway account (sign up at https://railway.app)
- [x] Vercel account (sign up at https://vercel.com)
- [x] GitHub repository for this project (already created)

---

## Part 1: Deploy Backend to Railway

### Step 1: Create New Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Select your repository: `NateDevIO/revenue-intel-saas`
5. Railway will detect the `railway.toml` configuration automatically

### Step 2: Configure Railway Project

1. After project creation, Railway will start building automatically
2. Click on your service to configure it
3. Click **"Settings"** tab
4. Set **Root Directory** to: `backend`
5. Set **Start Command** to: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

### Step 3: Add Environment Variables (Optional)

If you want AI-powered insights:

1. Go to **"Variables"** tab
2. Add new variable:
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: Your API key from https://console.anthropic.com/

### Step 4: Enable Public Domain

1. Go to **"Settings"** tab
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. Copy the generated URL (e.g., `https://your-backend.railway.app`)
5. **Save this URL** - you'll need it for Vercel

### Step 5: Verify Deployment

1. Wait for build to complete (2-3 minutes)
2. Visit: `https://your-backend.railway.app/api/health`
3. You should see: `{"status": "ok", "database": "connected"}`
4. Visit: `https://your-backend.railway.app/docs`
5. You should see the interactive API documentation

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Connect GitHub Repository

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `NateDevIO/revenue-intel-saas`
4. Click **"Import"**

### Step 2: Configure Project Settings

1. **Framework Preset**: Next.js (auto-detected)
2. **Root Directory**: Click **"Edit"** and set to `frontend`
3. **Build Command**: `npm run build` (default, leave as-is)
4. **Output Directory**: `.next` (default, leave as-is)

### Step 3: Add Environment Variables

1. Scroll to **"Environment Variables"** section
2. Add the following:
   - **Name**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your Railway backend URL (e.g., `https://your-backend.railway.app`)
   - **Environment**: All (Production, Preview, Development)
3. Click **"Add"**

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. Vercel will provide a production URL (e.g., `https://revenue-intel-saas.vercel.app`)

### Step 5: Verify Deployment

1. Visit your Vercel URL
2. You should see the Executive Summary dashboard
3. Check that data loads correctly (not just spinners)
4. Test navigation between pages

---

## Part 3: Configure CORS (If Needed)

If you see CORS errors in the browser console:

### Update Backend CORS Settings

1. In Railway, go to **"Variables"** tab
2. Add new variable:
   - **Key**: `ALLOWED_ORIGINS`
   - **Value**: `https://your-vercel-app.vercel.app`
3. Restart the Railway deployment

---

## Part 4: Custom Domain (Optional)

### For Vercel (Frontend)

1. Go to Vercel project **"Settings"** → **"Domains"**
2. Click **"Add"**
3. Enter your custom domain (e.g., `analytics.yourdomain.com`)
4. Follow DNS configuration instructions

### For Railway (Backend)

1. Go to Railway project **"Settings"** → **"Networking"**
2. Click **"Custom Domain"**
3. Enter your domain (e.g., `api.yourdomain.com`)
4. Add CNAME record to your DNS

---

## Environment Variables Reference

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Railway backend URL | `https://backend.railway.app` |

### Backend (Railway)

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API key for AI insights | No | `sk-ant-...` |
| `ALLOWED_ORIGINS` | CORS allowed origins | No | `https://app.vercel.app` |
| `PORT` | Port number | Auto-set by Railway | `8000` |

---

## Automatic Deployments

Both Railway and Vercel are configured for automatic deployments:

- **Push to `main` branch** → Automatic production deployment
- **Push to feature branch** → Automatic preview deployment (Vercel only)
- **Pull Request** → Automatic preview deployment

No manual intervention needed!

---

## Monitoring & Logs

### Railway Logs

1. Go to Railway project
2. Click **"Deployments"** tab
3. Click on any deployment to view logs
4. Use the live log viewer to debug issues

### Vercel Logs

1. Go to Vercel project
2. Click **"Deployments"**
3. Click on any deployment
4. View **"Build Logs"** and **"Function Logs"**

---

## Troubleshooting

### Backend: Build Fails

**Error**: `ModuleNotFoundError: No module named 'X'`

**Solution**:
- Ensure `requirements.txt` includes all dependencies
- Check Railway build logs for specific errors

### Backend: Database Empty

**Error**: API returns empty data

**Solution**:
- The Dockerfile runs `python -m data.generator` during build
- Check Railway logs to ensure data generation completed
- If needed, manually trigger: Add environment variable `REGENERATE_DATA=true`

### Frontend: API Calls Fail

**Error**: `Failed to fetch` or CORS errors

**Solution**:
1. Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel
2. Ensure Railway backend is running (check `/api/health`)
3. Check browser console for specific error messages
4. Add CORS configuration if needed (see Part 3)

### Frontend: Environment Variable Not Working

**Error**: Still connecting to localhost

**Solution**:
1. Ensure variable name starts with `NEXT_PUBLIC_`
2. Redeploy after adding environment variables
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

---

## Cost Estimates

### Railway (Backend)

- **Free Tier**: $5/month credit included
- **Estimated Usage**: $3-7/month
  - ~500 MB RAM
  - ~100-500 MB disk (DuckDB database)
  - ~10GB bandwidth/month

**Total**: Likely covered by free tier for moderate usage

### Vercel (Frontend)

- **Free Tier**: Generous limits
  - 100 GB bandwidth
  - Unlimited deployments
  - Serverless function executions

**Total**: $0/month for most use cases

### Total Monthly Cost

**$0-7/month** depending on traffic

---

## Scaling Considerations

### When You Need to Scale

- **Traffic**: >10K users/month
- **Data**: >1M records
- **Team**: Multiple concurrent analysts

### Upgrade Path

1. **Railway**: Upgrade to Pro plan ($20/month) for:
   - More RAM (up to 32GB)
   - Faster CPUs
   - Dedicated instances

2. **Database**: Migrate from DuckDB to PostgreSQL
   - Railway has PostgreSQL templates
   - Better for concurrent writes
   - More robust for production

3. **Caching**: Add Redis for API response caching
   - Railway has Redis templates
   - Significant performance boost

---

## Security Best Practices

### 1. Environment Variables

- ✅ Never commit `.env` files
- ✅ Use different API keys for dev/prod
- ✅ Rotate API keys regularly

### 2. CORS Configuration

- ✅ Only allow your Vercel domain in CORS
- ✅ Don't use `*` wildcard in production

### 3. API Keys

- ✅ Store Anthropic API key in Railway environment variables
- ✅ Never expose API keys in frontend code

### 4. HTTPS

- ✅ Both Railway and Vercel provide automatic HTTPS
- ✅ Ensure all API calls use HTTPS URLs

---

## Maintenance

### Database Backup

DuckDB database is regenerated on each deploy. For persistent data:

1. Create a backup script:
```bash
# On Railway, schedule this via cron or GitHub Actions
cp /app/saas_revenue.duckdb /app/backups/backup-$(date +%Y%m%d).duckdb
```

2. Upload backups to S3/Google Cloud Storage

### Monitoring

1. **Uptime Monitoring**: Use UptimeRobot (free)
   - Monitor: `https://your-backend.railway.app/api/health`
   - Monitor: `https://your-frontend.vercel.app`

2. **Error Tracking**: Railway and Vercel provide basic error logs

3. **Analytics**: Vercel Analytics (optional, $10/month)

---

## Support

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Project Issues**: https://github.com/NateDevIO/revenue-intel-saas/issues

---

**🎉 You're all set! Your SaaS Revenue Intelligence Platform is now live.**
