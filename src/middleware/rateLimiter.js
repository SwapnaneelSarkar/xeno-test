const rateLimit = require("express-rate-limit")
const RedisStore = require("rate-limit-redis")
const Redis = require("ioredis")

// Redis client for rate limiting
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379")

// General API rate limiter
const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Shopify webhook rate limiter (more permissive)
const webhookLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Allow more webhook requests
  message: {
    error: "Webhook rate limit exceeded",
  },
  skip: (req) => {
    // Skip rate limiting for verified Shopify webhooks
    return req.headers["x-shopify-hmac-sha256"] !== undefined
  },
})

module.exports = {
  apiLimiter,
  webhookLimiter,
}
