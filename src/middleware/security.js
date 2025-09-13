const helmet = require('helmet')
const { body, validationResult } = require('express-validator')
const { 
  redis, 
  generalRateLimit, 
  webhookRateLimit, 
  authRateLimit 
} = require('./redisRateLimiter')

// Helmet configuration
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
})

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Shopify-Topic', 'X-Shopify-Shop-Domain', 'X-Shopify-Hmac-Sha256']
}

// Input validation middleware
const validateInput = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    })
  }
  next()
}

// Sanitize sensitive data in logs
const sanitizeLogData = (data) => {
  if (typeof data !== 'object' || data === null) return data
  
  const sensitiveFields = ['password', 'token', 'accessToken', 'secret', 'key', 'hmac']
  const sanitized = { ...data }
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***'
    }
  }
  
  return sanitized
}

// Validation rules
const validationRules = {
  webhook: [
    body('id').isNumeric().withMessage('ID must be numeric'),
    body('order_number').optional().isString().withMessage('Order number must be string'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('total_price').optional().isString().withMessage('Total price must be string')
  ],
  
  tenant: [
    body('name').isString().isLength({ min: 1, max: 255 }).withMessage('Name is required and must be 1-255 characters'),
    body('email').isEmail().withMessage('Valid email required'),
    body('shopDomain').isString().isLength({ min: 1, max: 255 }).withMessage('Shop domain is required and must be 1-255 characters')
  ],
  
  auth: [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ]
}

module.exports = {
  helmetConfig,
  corsOptions,
  generalRateLimit,
  webhookRateLimit,
  authRateLimit,
  validateInput,
  sanitizeLogData,
  validationRules,
  redis
}
