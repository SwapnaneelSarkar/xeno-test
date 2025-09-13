const express = require('express')
const router = express.Router()
const webhookRegistration = require('../services/shopifyWebhookRegistration')
const { PrismaClient } = require('@prisma/client')
const logger = require('../utils/logger')

const prisma = new PrismaClient()

// Register webhooks for a tenant
router.post('/register/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params

    // Get tenant details
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // Register webhooks
    const results = await webhookRegistration.registerWebhooks(
      tenant.shopDomain,
      tenant.accessToken
    )

    logger.info(`Webhook registration completed for tenant: ${tenantId}`)
    res.status(200).json({
      success: true,
      message: 'Webhook registration completed',
      results
    })
  } catch (error) {
    logger.error('Webhook registration error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get webhooks for a tenant
router.get('/list/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params

    // Get tenant details
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // Get webhooks from Shopify
    const webhooks = await webhookRegistration.getWebhooks(
      tenant.shopDomain,
      tenant.accessToken
    )

    res.status(200).json({
      success: true,
      data: webhooks
    })
  } catch (error) {
    logger.error('Get webhooks error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete all webhooks for a tenant
router.delete('/delete-all/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params

    // Get tenant details
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // Delete all webhooks
    const results = await webhookRegistration.deleteAllWebhooks(
      tenant.shopDomain,
      tenant.accessToken
    )

    logger.info(`All webhooks deleted for tenant: ${tenantId}`)
    res.status(200).json({
      success: true,
      message: 'All webhooks deleted',
      results
    })
  } catch (error) {
    logger.error('Delete webhooks error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get webhook events for a tenant
router.get('/events/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params
    const { page = 1, limit = 50, topic, processed } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = { tenantId }
    if (topic) where.topic = topic
    if (processed !== undefined) where.processed = processed === 'true'

    const [events, total] = await Promise.all([
      prisma.webhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.webhookEvent.count({ where })
    ])

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    logger.error('Get webhook events error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Retry failed webhook events
router.post('/retry/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params

    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return res.status(404).json({ error: 'Webhook event not found' })
    }

    if (event.processed) {
      return res.status(400).json({ error: 'Webhook event already processed' })
    }

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: event.tenantId }
    })

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // Process webhook again
    const webhookService = require('../services/webhookService')
    const result = await webhookService.processWebhook(
      event.topic,
      event.payload,
      tenant.id
    )

    if (result.success) {
      // Update event as processed
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          processed: true,
          processedAt: new Date(),
          errorMessage: null
        }
      })

      res.status(200).json({
        success: true,
        message: 'Webhook event retried successfully',
        data: result.data
      })
    } else {
      // Update error message
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          errorMessage: result.message
        }
      })

      res.status(400).json({
        success: false,
        message: result.message
      })
    }
  } catch (error) {
    logger.error('Retry webhook event error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Retry all failed webhook events for a tenant
router.post('/retry-failed/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params
    const { limit = 100 } = req.body

    // Get failed events for tenant
    const failedEvents = await prisma.webhookEvent.findMany({
      where: {
        tenantId,
        processed: false
      },
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit)
    })

    if (failedEvents.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No failed events found',
        data: { retried: 0, failed: 0 }
      })
    }

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    const webhookService = require('../services/webhookService')
    let retried = 0
    let failed = 0
    const results = []

    for (const event of failedEvents) {
      try {
        const result = await webhookService.processWebhook(
          event.topic,
          event.payload,
          tenant.id
        )

        if (result.success) {
          await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              processed: true,
              processedAt: new Date(),
              errorMessage: null
            }
          })
          retried++
          results.push({ eventId: event.id, status: 'success' })
        } else {
          await prisma.webhookEvent.update({
            where: { id: event.id },
            data: {
              errorMessage: result.message
            }
          })
          failed++
          results.push({ eventId: event.id, status: 'failed', error: result.message })
        }
      } catch (error) {
        failed++
        results.push({ eventId: event.id, status: 'error', error: error.message })
      }
    }

    res.status(200).json({
      success: true,
      message: `Retry completed: ${retried} successful, ${failed} failed`,
      data: {
        retried,
        failed,
        total: failedEvents.length,
        results
      }
    })
  } catch (error) {
    logger.error('Retry failed webhook events error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get webhook event statistics
router.get('/stats/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params
    const { days = 7 } = req.query

    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)

    const stats = await prisma.webhookEvent.groupBy({
      by: ['topic', 'processed'],
      _count: {
        id: true
      },
      where: {
        tenantId,
        createdAt: {
          gte: since
        }
      }
    })

    const totalEvents = await prisma.webhookEvent.count({
      where: {
        tenantId,
        createdAt: {
          gte: since
        }
      }
    })

    const failedEvents = await prisma.webhookEvent.count({
      where: {
        tenantId,
        processed: false,
        createdAt: {
          gte: since
        }
      }
    })

    res.status(200).json({
      success: true,
      data: {
        totalEvents,
        failedEvents,
        successRate: totalEvents > 0 ? ((totalEvents - failedEvents) / totalEvents * 100).toFixed(2) : 0,
        stats: stats.map(stat => ({
          topic: stat.topic,
          processed: stat.processed,
          count: stat._count.id
        })),
        period: `${days} days`
      }
    })
  } catch (error) {
    logger.error('Get webhook stats error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Mark webhook event as failed (for testing)
router.post('/mark-failed/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params
    const { errorMessage = 'Manually marked as failed' } = req.body

    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return res.status(404).json({ error: 'Webhook event not found' })
    }

    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        processed: false,
        errorMessage
      }
    })

    res.status(200).json({
      success: true,
      message: 'Webhook event marked as failed'
    })
  } catch (error) {
    logger.error('Mark webhook event as failed error:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
