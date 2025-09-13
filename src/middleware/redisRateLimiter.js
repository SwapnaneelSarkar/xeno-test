const Redis = require('ioredis')

// Redis client for rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null
})

// Custom Redis rate limiter
class RedisRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000 // 15 minutes
    this.max = options.max || 100
    this.message = options.message || 'Too many requests'
    this.skip = options.skip || (() => false)
    this.keyGenerator = options.keyGenerator || ((req) => req.ip)
  }

  async checkLimit(req, res, next) {
    try {
      // Skip if configured to skip
      if (this.skip(req)) {
        return next()
      }

      const key = `rate_limit:${this.keyGenerator(req)}`
      const now = Date.now()
      const window = Math.floor(now / this.windowMs)
      const redisKey = `${key}:${window}`

      // Use Redis pipeline for atomic operations
      const pipeline = redis.pipeline()
      
      // Increment counter
      pipeline.incr(redisKey)
      // Set expiration
      pipeline.expire(redisKey, Math.ceil(this.windowMs / 1000))
      
      const results = await pipeline.exec()
      const count = results[0][1] // Get the result of incr

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': this.max,
        'X-RateLimit-Remaining': Math.max(0, this.max - count),
        'X-RateLimit-Reset': new Date(now + this.windowMs).toISOString()
      })

      if (count > this.max) {
        return res.status(429).json({
          error: this.message,
          retryAfter: Math.ceil(this.windowMs / 1000)
        })
      }

      next()
    } catch (error) {
      // If Redis fails, allow the request (fail open)
      console.warn('Redis rate limiter error:', error.message)
      next()
    }
  }
}

// Create rate limiter instances
const createRedisRateLimit = (windowMs, max, message, skip) => {
  const limiter = new RedisRateLimiter({
    windowMs,
    max,
    message,
    skip
  })
  
  return (req, res, next) => limiter.checkLimit(req, res, next)
}

// Rate limiting configurations
const generalRateLimit = createRedisRateLimit(
  15 * 60 * 1000, // 15 minutes
  1500, // limit each IP to 1500 requests per windowMs (5x increase from 300)
  'Too many requests from this IP, please try again later',
  (req) => req.path === '/health' // Skip health checks
)

const webhookRateLimit = createRedisRateLimit(
  15 * 60 * 1000, // 15 minutes
  750, // limit each IP to 750 webhook requests per windowMs (5x increase from 150)
  'Too many webhook requests from this IP, please try again later',
  (req) => req.path === '/health' // Skip health checks
)

const authRateLimit = createRedisRateLimit(
  15 * 60 * 1000, // 15 minutes
  150, // limit each IP to 150 auth requests per windowMs (5x increase from 30)
  'Too many authentication attempts from this IP, please try again later',
  (req) => req.path === '/health' // Skip health checks
)

module.exports = {
  redis,
  generalRateLimit,
  webhookRateLimit,
  authRateLimit,
  createRedisRateLimit
}
