# Railway Configuration Guide for xeno-fde-backend

## Overview
This guide explains how to configure your xeno-fde-backend service on Railway using the provided configuration files.

## Configuration Files

### 1. railway.toml (Recommended)
The primary configuration file using TOML format:

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile.prod"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
watchPaths = ["src/**", "prisma/**", "package.json", "package-lock.json"]

[environments.production]
[environments.production.variables]
NODE_ENV = "production"
PORT = "8080"
```

### 2. railway.json (Alternative)
JSON format configuration file for compatibility.

## Railway Dashboard Configuration

### Public Networking
- **Generate Domain**: Enable this to get a public URL like `xeno-test.railway.app`
- **Custom Domain**: Add your own domain (e.g., `api.yourdomain.com`)
- **TCP Proxy**: Not needed for HTTP services

### Private Networking
- **Service Name**: `xeno-test`
- **Internal DNS**: `xeno-test.railway.internal`
- **Use Case**: For internal service communication

### Build Configuration
- **Builder**: Dockerfile (recommended for production)
- **Dockerfile**: `Dockerfile.prod`
- **Watch Paths**: 
  - `src/**` - Source code changes
  - `prisma/**` - Database schema changes
  - `package.json` - Dependency changes
  - `package-lock.json` - Lock file changes

### Deploy Configuration
- **Start Command**: `npm start`
- **Healthcheck Path**: `/health`
- **Healthcheck Timeout**: 30 seconds
- **Restart Policy**: On Failure
- **Max Restart Retries**: 10

### Resource Limits
- **CPU**: 2 vCPU (matches your plan limit)
- **Memory**: 1 GB (matches your plan limit)
- **Region**: Southeast Asia (Singapore)

### Environment Variables
Set these in the Railway dashboard:

#### Required Variables
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=<automatically provided by Railway PostgreSQL>
```

#### Optional Variables
```bash
# Redis (optional - app works without it)
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

# Security (set these in Railway dashboard)
JWT_SECRET=your-production-jwt-secret
WEBHOOK_SECRET=your-production-webhook-secret

# CORS
ALLOWED_ORIGINS=https://yourdomain.com

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Shopify Configuration
SHOPIFY_API_VERSION=2025-01
SHOPIFY_WEBHOOK_VERIFY=true
```

## Deployment Steps

### 1. Connect Repository
1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `xeno-fde-backend` repository

### 2. Add Database
1. In your project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provide `DATABASE_URL`

### 3. Configure Service
1. Click on your service
2. Go to "Settings" tab
3. Configure the settings as described above

### 4. Set Environment Variables
1. Go to "Variables" tab
2. Add the required environment variables
3. Make sure to set secure values for `JWT_SECRET` and `WEBHOOK_SECRET`

### 5. Deploy
1. Railway will automatically deploy when you push to your main branch
2. Monitor the deployment in the "Deployments" tab
3. Check logs in the "Logs" tab

## Health Check Endpoint

Your application includes a health check endpoint at `/health` that Railway will use to verify the service is running properly.

## Monitoring and Logs

- **Logs**: Available in Railway dashboard under "Logs" tab
- **Metrics**: CPU, Memory, and Network usage in "Metrics" tab
- **Deployments**: Track deployment history in "Deployments" tab

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Dockerfile.prod exists and is correct
   - Verify all dependencies are in package.json
   - Check build logs for specific errors

2. **Health Check Failures**
   - Ensure `/health` endpoint is working
   - Check if the service is binding to the correct port
   - Verify environment variables are set correctly

3. **Database Connection Issues**
   - Verify `DATABASE_URL` is set correctly
   - Check if PostgreSQL service is running
   - Run database migrations if needed

4. **Memory/CPU Issues**
   - Monitor resource usage in Metrics tab
   - Consider upgrading plan if needed
   - Optimize application code if consistently hitting limits

### Useful Commands

```bash
# Deploy to Railway
railway up

# View logs
railway logs

# Check status
railway status

# Run database migrations
railway run npx prisma migrate deploy

# Seed database
railway run npm run seed
```

## Security Considerations

1. **Environment Variables**: Never commit secrets to your repository
2. **HTTPS**: Railway provides HTTPS by default
3. **CORS**: Configure `ALLOWED_ORIGINS` properly
4. **Rate Limiting**: Configure appropriate rate limits
5. **Database**: Use Railway's managed PostgreSQL for security

## Scaling

- **Horizontal Scaling**: Upgrade to Pro plan for multiple replicas
- **Vertical Scaling**: Adjust CPU/Memory limits as needed
- **Database**: Railway PostgreSQL scales automatically

## Backup and Recovery

- **Database Backups**: Railway PostgreSQL includes automatic backups
- **Code Backups**: Your code is in Git repository
- **Environment Variables**: Document all variables for disaster recovery

## Support

- **Railway Docs**: https://docs.railway.app/
- **Community**: Railway Discord
- **Status Page**: https://status.railway.app/
