# Railway Deployment Guide

This guide will help you deploy your Xeno FDE Backend to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Database**: PostgreSQL database (Railway provides this)

## Quick Start

### 1. Connect GitHub Repository

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `xeno-fde-backend` repository
5. Railway will automatically detect it's a Node.js project

### 2. Add PostgreSQL Database

1. In your Railway project dashboard
2. Click "New" → "Database" → "PostgreSQL"
3. Railway will automatically provide a `DATABASE_URL` environment variable

### 3. Configure Environment Variables

In your Railway project dashboard, go to the "Variables" tab and set:

#### Required Variables
```bash
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-here
WEBHOOK_SECRET=your-shopify-webhook-secret-here
ALLOWED_ORIGINS=https://yourdomain.com,https://yourfrontend.com
```

#### Optional Variables
```bash
# Redis (optional - app works without it)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Logging
LOG_LEVEL=info

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn-here
```

### 4. Deploy

Railway will automatically deploy your application when you push to the main branch. You can also trigger a manual deployment from the dashboard.

## Configuration Details

### Railway-Specific Features

The application includes Railway-specific optimizations:

- **Automatic Port Detection**: Uses `process.env.PORT` provided by Railway
- **Database URL**: Automatically uses Railway's `DATABASE_URL`
- **HTTPS Handling**: Railway handles HTTPS termination
- **Graceful Redis Degradation**: Works without Redis (rate limiting disabled)
- **Health Checks**: Configured for Railway's health check system

### Environment Variables Explained

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `JWT_SECRET` | Yes | Secret for JWT tokens | - |
| `WEBHOOK_SECRET` | Yes | Shopify webhook verification | - |
| `ALLOWED_ORIGINS` | Yes | CORS allowed origins | - |
| `DATABASE_URL` | Auto | PostgreSQL connection string | Provided by Railway |
| `PORT` | Auto | Application port | Provided by Railway |
| `REDIS_HOST` | No | Redis host (optional) | - |
| `REDIS_PORT` | No | Redis port (optional) | - |
| `REDIS_PASSWORD` | No | Redis password (optional) | - |

### Health Check Endpoints

Railway uses these endpoints for health monitoring:

- **Health Check**: `GET /health` - Full health status
- **Readiness**: `GET /ready` - Service readiness
- **Liveness**: `GET /live` - Service liveness

## Database Setup

### 1. Run Migrations

After deployment, you need to run Prisma migrations:

```bash
# Connect to your Railway service
railway connect

# Run migrations
npx prisma migrate deploy

# (Optional) Seed the database
npm run seed
```

### 2. Database Schema

The application uses Prisma with the following main models:
- `Tenant` - Shopify store information
- `WebhookEvent` - Webhook event tracking
- `SyncStatus` - Data synchronization status

## Monitoring and Logs

### View Logs
```bash
# Using Railway CLI
railway logs

# Or view in Railway dashboard
```

### Health Monitoring
- Railway automatically monitors the `/health` endpoint
- Check the "Metrics" tab in your Railway dashboard
- Set up alerts for service downtime

## Troubleshooting

### Common Issues

1. **Application Won't Start**
   - Check environment variables are set correctly
   - Verify `JWT_SECRET` and `WEBHOOK_SECRET` are provided
   - Check logs for specific error messages

2. **Database Connection Issues**
   - Ensure PostgreSQL service is running
   - Verify `DATABASE_URL` is set correctly
   - Run migrations: `npx prisma migrate deploy`

3. **Health Check Failures**
   - Check if all required environment variables are set
   - Verify database connectivity
   - Check application logs for errors

4. **CORS Issues**
   - Update `ALLOWED_ORIGINS` with your frontend domain
   - Ensure HTTPS is used in production

### Debug Commands

```bash
# Check service status
railway status

# View recent logs
railway logs --tail

# Connect to service shell
railway shell

# Check environment variables
railway variables
```

## Production Checklist

Before going live, ensure:

- [ ] All environment variables are set
- [ ] Database migrations are run
- [ ] Health checks are passing
- [ ] CORS origins are configured correctly
- [ ] SSL/HTTPS is working (handled by Railway)
- [ ] Monitoring is set up
- [ ] Error tracking is configured (Sentry)

## Scaling

Railway automatically handles:
- Load balancing
- Auto-scaling based on traffic
- Zero-downtime deployments
- Health check monitoring

## Support

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Application Logs**: Check Railway dashboard for detailed logs

## Security Notes

- Never commit secrets to your repository
- Use Railway's environment variables for sensitive data
- Regularly rotate JWT secrets and webhook secrets
- Monitor access logs for suspicious activity
- Keep dependencies updated

---

Your application is now ready for production deployment on Railway! 🚀
