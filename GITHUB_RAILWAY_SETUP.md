# GitHub to Railway Deployment Setup

This guide will help you set up automatic deployment from GitHub to Railway.

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Railway Account**: Sign up at [railway.app](https://railway.app)
3. **Railway CLI**: Install locally for initial setup

## Step 1: Set up Railway Project

### 1.1 Login to Railway
```bash
railway login
```

### 1.2 Create Railway Project
```bash
railway init
```

### 1.3 Add Database Service
In Railway dashboard:
1. Go to your project
2. Click "New Service"
3. Select "Database" → "PostgreSQL"
4. Railway will automatically set `DATABASE_URL`

### 1.4 Add Redis Service (Optional)
If you want Redis for rate limiting:
1. Click "New Service"
2. Select "Database" → "Redis"
3. Railway will automatically set `REDIS_URL`

## Step 2: Configure Environment Variables

In Railway dashboard, go to your service and add these variables:

### Required Variables
```
NODE_ENV=production
SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=https://your-frontend-domain.com
```

### Optional Variables
```
SENTRY_DSN=your_sentry_dsn
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Step 3: Set up Railway Token for GitHub Actions

### 3.1 Get Railway Token
1. Go to Railway dashboard
2. Click on your profile → "Account Settings"
3. Go to "Tokens" tab
4. Click "New Token"
5. Give it a name like "GitHub Actions"
6. Copy the token (you won't see it again!)

### 3.2 Add Token to GitHub Secrets
1. Go to your GitHub repository
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `RAILWAY_TOKEN`
5. Value: Paste your Railway token

## Step 4: Configure GitHub Actions

The workflow is already set up in `.github/workflows/deploy-railway.yml`. It will:

1. **Test Phase**: Run tests with PostgreSQL and Redis
2. **Deploy Phase**: Deploy to Railway (only on main branch)

### Workflow Triggers
- ✅ Push to `main` branch → Deploy to Railway
- ✅ Push to `develop` branch → Run tests only
- ✅ Pull requests to `main` → Run tests only

## Step 5: Deploy

### 5.1 First Deployment
```bash
# Commit and push your changes
git add .
git commit -m "Set up Railway deployment"
git push origin main
```

### 5.2 Monitor Deployment
- **GitHub Actions**: Go to "Actions" tab in your GitHub repo
- **Railway Dashboard**: Check deployment status
- **Logs**: Use `railway logs` or check Railway dashboard

## Step 6: Verify Deployment

### 6.1 Check Health
Your app will be available at: `https://your-app-name.railway.app`

Health check endpoint: `https://your-app-name.railway.app/health`

### 6.2 Test Endpoints
```bash
# Health check
curl https://your-app-name.railway.app/health

# Test other endpoints
curl https://your-app-name.railway.app/api/health
```

## Railway Configuration Files

The following files are configured for Railway:

- `railway.json` - Railway build configuration
- `railway.toml` - Alternative Railway configuration
- `.railwayignore` - Files to exclude from deployment
- `package.json` - Updated with Railway scripts

## Environment-Specific Settings

### Development
- Uses local database and Redis
- Port: 3000 (or PORT environment variable)
- Debug logging enabled

### Production (Railway)
- Uses Railway PostgreSQL and Redis
- Port: Set by Railway automatically
- Production logging
- Health checks enabled

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Railway build logs
   - Ensure all dependencies are in `package.json`
   - Verify Prisma schema is correct

2. **Database Connection Issues**
   - Check `DATABASE_URL` is set correctly
   - Ensure PostgreSQL service is running
   - Run migrations: `npx prisma migrate deploy`

3. **Environment Variable Issues**
   - Verify all required variables are set in Railway
   - Check variable names match exactly
   - Restart the service after adding variables

4. **Health Check Failures**
   - Check if app is running on correct port
   - Verify health endpoint is accessible
   - Check Railway logs for errors

### Useful Commands

```bash
# Check Railway status
railway status

# View logs
railway logs

# Connect to database
railway connect

# Open Railway dashboard
railway open

# Deploy manually
railway up
```

## Monitoring and Maintenance

### Health Monitoring
- Railway automatically monitors your app
- Health checks run every 30 seconds
- Failed health checks trigger restarts

### Logs
- Access logs via Railway dashboard
- Use `railway logs` for real-time logs
- Logs are retained for 30 days

### Scaling
- Railway automatically scales based on traffic
- Manual scaling available in dashboard
- Resource usage monitoring included

## Security

### Environment Variables
- All secrets are encrypted in Railway
- Never commit secrets to GitHub
- Use Railway dashboard for sensitive data

### HTTPS
- Railway provides free SSL certificates
- All traffic is encrypted by default
- Custom domains supported

## Support

- **Railway Docs**: https://docs.railway.app
- **GitHub Actions**: https://docs.github.com/en/actions
- **Railway Discord**: https://discord.gg/railway
