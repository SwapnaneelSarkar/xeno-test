const winston = require('winston')
const path = require('path')

// Custom format for JSON logging
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Custom format for console logging
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let log = `${timestamp} [${level}]`
    if (service) log += ` [${service}]`
    log += `: ${message}`
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`
    }
    
    return log
  })
)

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  defaultMeta: { service: 'xeno-fde-backend' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat
    }),
    
    // File transports
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
})

// Add request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    }
    
    // Add tenant info if available
    if (req.tenantId) {
      logData.tenantId = req.tenantId
    }
    
    // Log based on status code
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData)
    } else {
      logger.info('HTTP Request', logData)
    }
  })
  
  next()
}

// Add error logging
const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    tenantId: req.tenantId
  })
  
  next(err)
}

// Performance monitoring
const performanceLogger = {
  startTimer: (label) => {
    const start = process.hrtime.bigint()
    return {
      end: () => {
        const end = process.hrtime.bigint()
        const duration = Number(end - start) / 1000000 // Convert to milliseconds
        logger.info('Performance', { label, duration: `${duration.toFixed(2)}ms` })
        return duration
      }
    }
  }
}

// Business metrics logging
const metricsLogger = {
  webhookProcessed: (topic, tenantId, duration) => {
    logger.info('Webhook Processed', {
      topic,
      tenantId,
      duration: `${duration}ms`,
      type: 'business_metric'
    })
  },
  
  webhookFailed: (topic, tenantId, error) => {
    logger.error('Webhook Failed', {
      topic,
      tenantId,
      error: error.message,
      type: 'business_metric'
    })
  },
  
  syncCompleted: (tenantId, resourceType, count, duration) => {
    logger.info('Sync Completed', {
      tenantId,
      resourceType,
      count,
      duration: `${duration}ms`,
      type: 'business_metric'
    })
  },
  
  apiCall: (service, endpoint, status, duration) => {
    logger.info('API Call', {
      service,
      endpoint,
      status,
      duration: `${duration}ms`,
      type: 'business_metric'
    })
  }
}

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  performanceLogger,
  metricsLogger
}

// Also export logger as default for backward compatibility
module.exports.default = logger