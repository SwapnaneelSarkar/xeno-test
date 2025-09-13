const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { redis } = require('../middleware/security')
const { logger } = require('../utils/logger')
const { getCircuitBreakerHealth } = require('../services/circuitBreaker')

const router = express.Router()
const prisma = new PrismaClient()

// Health check endpoint
router.get('/health', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    checks: {}
  }

  try {
    // Database health check
    await prisma.$queryRaw`SELECT 1`
    healthCheck.checks.database = { status: 'UP' }
  } catch (error) {
    healthCheck.checks.database = { 
      status: 'DOWN', 
      error: error.message 
    }
    healthCheck.message = 'Service Unavailable'
  }

  try {
    // Redis health check
    await redis.ping()
    healthCheck.checks.redis = { status: 'UP' }
  } catch (error) {
    healthCheck.checks.redis = { 
      status: 'DOWN', 
      error: error.message 
    }
    healthCheck.message = 'Service Unavailable'
  }

  // Memory usage
  const memUsage = process.memoryUsage()
  healthCheck.checks.memory = {
    status: 'UP',
    usage: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    }
  }

  // CPU usage
  const cpuUsage = process.cpuUsage()
  healthCheck.checks.cpu = {
    status: 'UP',
    usage: {
      user: `${cpuUsage.user / 1000000}s`,
      system: `${cpuUsage.system / 1000000}s`
    }
  }

  // Circuit breaker health
  try {
    const circuitBreakerHealth = getCircuitBreakerHealth()
    healthCheck.checks.circuitBreaker = {
      status: circuitBreakerHealth.state === 'CLOSED' ? 'UP' : 'DEGRADED',
      state: circuitBreakerHealth.state,
      stats: circuitBreakerHealth.stats,
      dlqSize: circuitBreakerHealth.dlqSize
    }
  } catch (error) {
    healthCheck.checks.circuitBreaker = {
      status: 'DOWN',
      error: error.message
    }
  }

  const statusCode = healthCheck.message === 'OK' ? 200 : 503
  res.status(statusCode).json(healthCheck)
})

// Readiness check (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are available
    await prisma.$queryRaw`SELECT 1`
    await redis.ping()
    
    res.status(200).json({ 
      status: 'ready',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message })
    res.status(503).json({ 
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Liveness check (for Kubernetes)
router.get('/live', (req, res) => {
  res.status(200).json({ 
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

module.exports = router
