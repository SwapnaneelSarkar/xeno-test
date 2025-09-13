// Railway-specific configuration
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID

// Railway automatically provides these environment variables:
// - RAILWAY_ENVIRONMENT (production, preview, development)
// - RAILWAY_PROJECT_ID
// - RAILWAY_SERVICE_ID
// - DATABASE_URL (if PostgreSQL service is connected)
// - PORT (automatically set by Railway)

const railwayConfig = {
  isRailway: !!isRailway,
  environment: process.env.RAILWAY_ENVIRONMENT || 'development',
  projectId: process.env.RAILWAY_PROJECT_ID,
  serviceId: process.env.RAILWAY_SERVICE_ID,
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    // Railway provides DATABASE_URL directly, no need for separate host/port/user/pass
  },
  
  // Redis configuration (optional on Railway)
  redis: {
    host: process.env.REDIS_HOST || (isRailway ? '' : 'localhost'),
    port: process.env.REDIS_PORT || (isRailway ? '' : 6379),
    password: process.env.REDIS_PASSWORD || '',
    // If Redis is not configured, the app will work without it
    enabled: !!(process.env.REDIS_HOST && process.env.REDIS_PORT)
  },
  
  // Application configuration
  app: {
    port: process.env.PORT || 8080,
    nodeEnv: process.env.NODE_ENV || 'development',
    // Railway handles HTTPS termination, so we don't need to force HTTPS
    forceHttps: false
  },
  
  // Security configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || (isRailway ? null : 'dev-secret-key'),
    webhookSecret: process.env.WEBHOOK_SECRET || (isRailway ? null : 'dev-webhook-secret'),
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || (isRailway ? ['*'] : ['http://localhost:3000'])
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (isRailway ? 'info' : 'debug'),
    // Railway provides structured logging, so we can use JSON format
    format: isRailway ? 'json' : 'combined'
  }
}

// Validate required environment variables for Railway
if (isRailway) {
  const requiredVars = ['JWT_SECRET', 'WEBHOOK_SECRET']
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing required environment variables for Railway: ${missingVars.join(', ')}`)
    console.warn('Please set these in your Railway project dashboard')
  }
}

module.exports = railwayConfig
