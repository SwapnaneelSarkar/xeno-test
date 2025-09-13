const { logger } = require('../utils/logger')

// Simple APM-like monitoring service
class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byEndpoint: {}
      },
      webhooks: {
        total: 0,
        processed: 0,
        failed: 0,
        byTopic: {}
      },
      performance: {
        responseTime: [],
        memoryUsage: [],
        cpuUsage: []
      },
      errors: {
        byType: {},
        recent: []
      }
    }
    
    this.startTime = Date.now()
    this.alertThresholds = {
      errorRate: 0.1, // 10%
      responseTime: 5000, // 5 seconds
      memoryUsage: 0.9, // 90%
      dlqSize: 100
    }
  }

  // Track API request
  trackRequest(endpoint, method, statusCode, responseTime) {
    this.metrics.requests.total++
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++
    } else {
      this.metrics.requests.errors++
    }

    const key = `${method} ${endpoint}`
    if (!this.metrics.requests.byEndpoint[key]) {
      this.metrics.requests.byEndpoint[key] = { total: 0, success: 0, errors: 0 }
    }
    
    this.metrics.requests.byEndpoint[key].total++
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.byEndpoint[key].success++
    } else {
      this.metrics.requests.byEndpoint[key].errors++
    }

    // Track response time
    this.metrics.performance.responseTime.push({
      timestamp: Date.now(),
      endpoint,
      responseTime
    })

    // Keep only last 1000 response times
    if (this.metrics.performance.responseTime.length > 1000) {
      this.metrics.performance.responseTime = this.metrics.performance.responseTime.slice(-1000)
    }

    // Check for alerts
    this.checkAlerts()
  }

  // Track webhook processing
  trackWebhook(topic, success, processingTime) {
    this.metrics.webhooks.total++
    
    if (success) {
      this.metrics.webhooks.processed++
    } else {
      this.metrics.webhooks.failed++
    }

    if (!this.metrics.webhooks.byTopic[topic]) {
      this.metrics.webhooks.byTopic[topic] = { total: 0, processed: 0, failed: 0 }
    }
    
    this.metrics.webhooks.byTopic[topic].total++
    if (success) {
      this.metrics.webhooks.byTopic[topic].processed++
    } else {
      this.metrics.webhooks.byTopic[topic].failed++
    }
  }

  // Track error
  trackError(error, context = {}) {
    const errorType = error.constructor.name
    const errorMessage = error.message

    if (!this.metrics.errors.byType[errorType]) {
      this.metrics.errors.byType[errorType] = 0
    }
    this.metrics.errors.byType[errorType]++

    // Store recent errors
    this.metrics.errors.recent.push({
      timestamp: Date.now(),
      type: errorType,
      message: errorMessage,
      stack: error.stack,
      context
    })

    // Keep only last 100 errors
    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent = this.metrics.errors.recent.slice(-100)
    }

    logger.error('Error tracked', {
      service: 'monitoring',
      errorType,
      errorMessage,
      context
    })
  }

  // Track system metrics
  trackSystemMetrics() {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    this.metrics.performance.memoryUsage.push({
      timestamp: Date.now(),
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external
    })

    this.metrics.performance.cpuUsage.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    })

    // Keep only last 100 system metrics
    if (this.metrics.performance.memoryUsage.length > 100) {
      this.metrics.performance.memoryUsage = this.metrics.performance.memoryUsage.slice(-100)
    }
    if (this.metrics.performance.cpuUsage.length > 100) {
      this.metrics.performance.cpuUsage = this.metrics.performance.cpuUsage.slice(-100)
    }
  }

  // Check for alerts
  checkAlerts() {
    const errorRate = this.metrics.requests.errors / Math.max(this.metrics.requests.total, 1)
    
    if (errorRate > this.alertThresholds.errorRate) {
      this.sendAlert('HIGH_ERROR_RATE', {
        errorRate: errorRate.toFixed(2),
        threshold: this.alertThresholds.errorRate,
        totalRequests: this.metrics.requests.total,
        errors: this.metrics.requests.errors
      })
    }

    // Check average response time
    if (this.metrics.performance.responseTime.length > 0) {
      const avgResponseTime = this.metrics.performance.responseTime
        .slice(-100) // Last 100 requests
        .reduce((sum, metric) => sum + metric.responseTime, 0) / 100

      if (avgResponseTime > this.alertThresholds.responseTime) {
        this.sendAlert('HIGH_RESPONSE_TIME', {
          avgResponseTime: avgResponseTime.toFixed(2),
          threshold: this.alertThresholds.responseTime
        })
      }
    }

    // Check memory usage
    if (this.metrics.performance.memoryUsage.length > 0) {
      const latestMemory = this.metrics.performance.memoryUsage[this.metrics.performance.memoryUsage.length - 1]
      const memoryUsageRatio = latestMemory.heapUsed / latestMemory.heapTotal

      if (memoryUsageRatio > this.alertThresholds.memoryUsage) {
        this.sendAlert('HIGH_MEMORY_USAGE', {
          memoryUsageRatio: memoryUsageRatio.toFixed(2),
          threshold: this.alertThresholds.memoryUsage,
          heapUsed: latestMemory.heapUsed,
          heapTotal: latestMemory.heapTotal
        })
      }
    }
  }

  // Send alert (in production, this would integrate with Slack, email, etc.)
  sendAlert(type, data) {
    logger.warn(`ALERT: ${type}`, {
      service: 'monitoring',
      alertType: type,
      data,
      timestamp: new Date().toISOString()
    })

    // In production, you would send to:
    // - Slack webhook
    // - Email service
    // - PagerDuty
    // - Custom notification service
  }

  // Get metrics summary
  getMetrics() {
    const uptime = Date.now() - this.startTime
    const errorRate = this.metrics.requests.errors / Math.max(this.metrics.requests.total, 1)
    
    const avgResponseTime = this.metrics.performance.responseTime.length > 0
      ? this.metrics.performance.responseTime
          .slice(-100)
          .reduce((sum, metric) => sum + metric.responseTime, 0) / 100
      : 0

    const latestMemory = this.metrics.performance.memoryUsage.length > 0
      ? this.metrics.performance.memoryUsage[this.metrics.performance.memoryUsage.length - 1]
      : null

    return {
      uptime,
      requests: {
        ...this.metrics.requests,
        errorRate: errorRate.toFixed(4)
      },
      webhooks: this.metrics.webhooks,
      performance: {
        avgResponseTime: avgResponseTime.toFixed(2),
        memoryUsage: latestMemory,
        responseTimeHistory: this.metrics.performance.responseTime.slice(-50)
      },
      errors: {
        byType: this.metrics.errors.byType,
        recent: this.metrics.errors.recent.slice(-10)
      },
      alerts: {
        thresholds: this.alertThresholds,
        current: {
          errorRate,
          avgResponseTime,
          memoryUsage: latestMemory ? latestMemory.heapUsed / latestMemory.heapTotal : 0
        }
      }
    }
  }

  // Reset metrics
  reset() {
    this.metrics = {
      requests: { total: 0, success: 0, errors: 0, byEndpoint: {} },
      webhooks: { total: 0, processed: 0, failed: 0, byTopic: {} },
      performance: { responseTime: [], memoryUsage: [], cpuUsage: [] },
      errors: { byType: {}, recent: [] }
    }
    this.startTime = Date.now()
  }
}

// Create singleton instance
const monitoringService = new MonitoringService()

// Start system metrics collection
setInterval(() => {
  monitoringService.trackSystemMetrics()
}, 30000) // Every 30 seconds

module.exports = monitoringService
