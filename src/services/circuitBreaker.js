const CircuitBreaker = require('opossum')
const { logger } = require('../utils/logger')

// Circuit breaker options
const circuitBreakerOptions = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50, // 50% error rate
  resetTimeout: 30000, // 30 seconds
  rollingCountTimeout: 10000, // 10 seconds
  rollingCountBuckets: 10,
  name: 'shopify-api',
  group: 'external-apis'
}

// Create circuit breaker for Shopify API calls
const shopifyCircuitBreaker = new CircuitBreaker(shopifyApiCall, circuitBreakerOptions)

// Circuit breaker event handlers
shopifyCircuitBreaker.on('open', () => {
  logger.warn('Circuit breaker opened - Shopify API is failing', {
    service: 'circuit-breaker',
    action: 'opened',
    threshold: circuitBreakerOptions.errorThresholdPercentage
  })
})

shopifyCircuitBreaker.on('halfOpen', () => {
  logger.info('Circuit breaker half-open - testing Shopify API', {
    service: 'circuit-breaker',
    action: 'half-open'
  })
})

shopifyCircuitBreaker.on('close', () => {
  logger.info('Circuit breaker closed - Shopify API is healthy', {
    service: 'circuit-breaker',
    action: 'closed'
  })
})

shopifyCircuitBreaker.on('failure', (error) => {
  logger.error('Circuit breaker failure', {
    service: 'circuit-breaker',
    action: 'failure',
    error: error.message,
    stack: error.stack
  })
})

shopifyCircuitBreaker.on('success', (result) => {
  logger.debug('Circuit breaker success', {
    service: 'circuit-breaker',
    action: 'success',
    status: result?.status
  })
})

// Wrapper function for Shopify API calls
async function shopifyApiCall(apiFunction, ...args) {
  try {
    const result = await apiFunction(...args)
    return result
  } catch (error) {
    // Log the error and re-throw it
    logger.error('Shopify API call failed', {
      service: 'shopify-api',
      error: error.message,
      status: error.response?.status,
      url: error.config?.url
    })
    throw error
  }
}

// Exponential backoff retry function
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries) {
        logger.error('Max retries exceeded', {
          service: 'retry',
          attempts: maxRetries,
          error: error.message
        })
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
      logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
        service: 'retry',
        attempt,
        delay,
        error: error.message
      })
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Dead letter queue for failed webhooks
class DeadLetterQueue {
  constructor() {
    this.queue = []
    this.maxSize = 1000
  }
  
  add(webhookEvent, error) {
    const dlqEntry = {
      id: webhookEvent.id,
      tenantId: webhookEvent.tenantId,
      topic: webhookEvent.topic,
      payload: webhookEvent.payload,
      error: error.message,
      timestamp: new Date(),
      retryCount: 0
    }
    
    // Remove oldest entries if queue is full
    if (this.queue.length >= this.maxSize) {
      this.queue.shift()
    }
    
    this.queue.push(dlqEntry)
    
    logger.error('Webhook added to dead letter queue', {
      service: 'dlq',
      webhookId: webhookEvent.id,
      topic: webhookEvent.topic,
      error: error.message
    })
  }
  
  getFailedWebhooks(limit = 10) {
    return this.queue.slice(-limit)
  }
  
  remove(webhookId) {
    const index = this.queue.findIndex(entry => entry.id === webhookId)
    if (index !== -1) {
      this.queue.splice(index, 1)
      return true
    }
    return false
  }
  
  clear() {
    this.queue = []
  }
}

// Create dead letter queue instance
const deadLetterQueue = new DeadLetterQueue()

// Enhanced webhook processing with circuit breaker and retry
async function processWebhookWithResilience(webhookEvent, processFunction) {
  try {
    // Use circuit breaker for the processing function
    const result = await shopifyCircuitBreaker.fire(processFunction, webhookEvent)
    return result
  } catch (error) {
    // If circuit breaker is open or function fails, add to DLQ
    deadLetterQueue.add(webhookEvent, error)
    
    // Re-throw the error for upstream handling
    throw error
  }
}

// Process dead letter queue entries
async function processDeadLetterQueue(processFunction, batchSize = 5) {
  const failedWebhooks = deadLetterQueue.getFailedWebhooks(batchSize)
  
  for (const dlqEntry of failedWebhooks) {
    try {
      // Reconstruct webhook event
      const webhookEvent = {
        id: dlqEntry.id,
        tenantId: dlqEntry.tenantId,
        topic: dlqEntry.topic,
        payload: dlqEntry.payload
      }
      
      // Retry with exponential backoff
      await retryWithBackoff(async () => {
        return await processFunction(webhookEvent)
      }, 3, 2000)
      
      // Remove from DLQ on success
      deadLetterQueue.remove(dlqEntry.id)
      
      logger.info('Successfully processed webhook from DLQ', {
        service: 'dlq-processor',
        webhookId: dlqEntry.id
      })
      
    } catch (error) {
      logger.error('Failed to process webhook from DLQ', {
        service: 'dlq-processor',
        webhookId: dlqEntry.id,
        error: error.message
      })
    }
  }
}

// Health check for circuit breaker
function getCircuitBreakerHealth() {
  return {
    state: shopifyCircuitBreaker.state,
    stats: shopifyCircuitBreaker.stats,
    dlqSize: deadLetterQueue.queue.length
  }
}

module.exports = {
  shopifyCircuitBreaker,
  retryWithBackoff,
  deadLetterQueue,
  processWebhookWithResilience,
  processDeadLetterQueue,
  getCircuitBreakerHealth
}
