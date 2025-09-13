# Railway Deployment Guide

This guide will help you deploy your xeno-fde-backend application to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install the Railway CLI
   ```bash
   npm install -g @railway/cli
   # or
   curl -fsSL https://railway.app/install.sh | sh
   ```

## Environment Variables

You'll need to set up the following environment variables in Railway:

### Required Variables
- `DATABASE_URL` - PostgreSQL connection string (Railway will provide this if you add a PostgreSQL service)
- `NODE_ENV` - Set to `production`
- `PORT` - Railway will set this automatically

### Shopify Configuration
- `SHOPIFY_CLIENT_ID` - Your Shopify app's client ID
- `SHOPIFY_CLIENT_SECRET` - Your Shopify app's client secret
- `SHOPIFY_WEBHOOK_SECRET` - Your webhook verification secret

### Security
- `JWT_SECRET` - Secret key for JWT token signing
- `CORS_ORIGIN` - Allowed CORS origins (use your frontend domain)

### Optional Variables
- `SENTRY_DSN` - For error tracking
- `REDIS_URL` - If using Redis for rate limiting (Railway will provide this if you add Redis service)

## Deployment Steps

### 1. Login to Railway
```bash
railway login
```

### 2. Initialize Railway Project
```bash
railway init
```

### 3. Add Database Service
In the Railway dashboard:
1. Go to your project
2. Click "New Service"
3. Select "Database" → "PostgreSQL"
4. Railway will automatically set the `DATABASE_URL` environment variable

### 4. Add Redis Service (Optional)
If you want to use Redis for rate limiting:
1. Click "New Service"
2. Select "Database" → "Redis"
3. Railway will automatically set the `REDIS_URL` environment variable

### 5. Set Environment Variables
In the Railway dashboard:
1. Go to your service
2. Click on "Variables" tab
3. Add all the required environment variables listed above

### 6. Deploy
```bash
railway up
```

Or push to your connected Git repository:
```bash
git add .
git commit -m "Deploy to Railway"
git push
```

## Railway Configuration Files

The following files are configured for Railway deployment:

- `railway.json` - Railway build and deploy configuration
- `railway.toml` - Alternative Railway configuration
- `package.json` - Updated with Railway-specific scripts

## Health Check

Railway will automatically check the `/health` endpoint to ensure your application is running correctly.

## Monitoring

- **Logs**: Use `railway logs` or check the Railway dashboard
- **Metrics**: Available in the Railway dashboard
- **Status**: Use `railway status` to check deployment status

## Troubleshooting

### Common Issues

1. **Prisma Client Issues**
   - The `postinstall` script will automatically run `npx prisma generate`
   - Ensure your `DATABASE_URL` is correctly set

2. **Port Issues**
   - Railway automatically sets the `PORT` environment variable
   - Your app is configured to use `process.env.PORT || 8080`

3. **Database Connection**
   - Ensure the PostgreSQL service is running
   - Check that `DATABASE_URL` is properly formatted

4. **Build Failures**
   - Check the build logs in Railway dashboard
   - Ensure all dependencies are in `package.json`

### Useful Commands

```bash
# Check deployment status
railway status

# View logs
railway logs

# Connect to database
railway connect

# Open Railway dashboard
railway open
```

## Production Checklist

- [ ] All environment variables are set
- [ ] Database is connected and migrations are applied
- [ ] Health check endpoint is working
- [ ] CORS is configured for your frontend domain
- [ ] Rate limiting is properly configured
- [ ] Error tracking (Sentry) is set up
- [ ] SSL/HTTPS is enabled (Railway handles this automatically)

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Support: https://railway.app/support
