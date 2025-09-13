const express = require("express")
const router = express.Router()
const webhookService = require("../services/webhookService")
const { verifyShopifyWebhook, extractTenant } = require("../middleware/webhookVerification")
const { logger } = require("../utils/logger")

// Generic webhook handler for all Shopify webhooks
router.post("/", verifyShopifyWebhook, extractTenant, async (req, res) => {
  try {
    const { topic } = req.webhookMetadata
    const { tenant } = req
    const webhookData = req.body

    logger.info(`Processing webhook: ${topic} for tenant: ${tenant.id}`)

    const shopifyId = webhookData.id?.toString() || 'unknown'
    
    // Check if webhook already processed (idempotency)
    const alreadyProcessed = await webhookService.isWebhookProcessed(tenant.id, shopifyId, topic)
    if (alreadyProcessed) {
      logger.info(`Webhook already processed: ${topic} - ${shopifyId}`)
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook already processed',
        data: { message: 'Webhook already processed', idempotent: true }
      })
    }

    // Log webhook event
    await webhookService.logWebhookEvent(
      tenant.id,
      shopifyId,
      topic,
      webhookData
    )

    // Process webhook based on topic
    const result = await webhookService.processWebhook(topic, webhookData, tenant.id)

    if (result.success) {
      // Mark webhook as processed
      await webhookService.logWebhookEvent(
        tenant.id,
        webhookData.id?.toString() || 'unknown',
        topic,
        webhookData,
        true
      )

      logger.info(`Webhook processed successfully: ${topic}`)
      res.status(200).json({ 
        success: true, 
        message: 'Webhook processed successfully',
        data: result.data 
      })
    } else {
      // Mark webhook as failed
      await webhookService.logWebhookEvent(
        tenant.id,
        webhookData.id?.toString() || 'unknown',
        topic,
        webhookData,
        false,
        result.message
      )

      logger.error(`Webhook processing failed: ${topic} - ${result.message}`)
      res.status(400).json({ 
        success: false, 
        message: result.message 
      })
    }
  } catch (error) {
    logger.error('Webhook processing error:', error)
    
    // Log failed webhook
    if (req.tenant && req.webhookMetadata) {
      await webhookService.logWebhookEvent(
        req.tenant.id,
        req.body.id?.toString() || 'unknown',
        req.webhookMetadata.topic,
        req.body,
        false,
        error.message
      )
    }

    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    })
  }
})

// Specific webhook endpoints for backward compatibility
router.post("/shopify/orders", verifyShopifyWebhook, extractTenant, async (req, res) => {
  try {
    const { tenant } = req
    const webhookData = req.body

    const result = await webhookService.processOrderWebhook(webhookData, tenant.id)
    
    res.status(200).json({ 
      success: true, 
      message: 'Order webhook processed',
      data: result.data 
    })
  } catch (error) {
    logger.error('Order webhook error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post("/shopify/products", verifyShopifyWebhook, extractTenant, async (req, res) => {
  try {
    const { tenant } = req
    const webhookData = req.body

    const result = await webhookService.processProductWebhook(webhookData, tenant.id)
    
    res.status(200).json({ 
      success: true, 
      message: 'Product webhook processed',
      data: result.data 
    })
  } catch (error) {
    logger.error('Product webhook error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post("/shopify/customers", verifyShopifyWebhook, extractTenant, async (req, res) => {
  try {
    const { tenant } = req
    const webhookData = req.body

    const result = await webhookService.processCustomerWebhook(webhookData, tenant.id)
    
    res.status(200).json({ 
      success: true, 
      message: 'Customer webhook processed',
      data: result.data 
    })
  } catch (error) {
    logger.error('Customer webhook error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Webhook status endpoint
router.get("/shopify/status", async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()

    const webhookStats = await prisma.webhookEvent.groupBy({
      by: ['topic', 'processed'],
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    const totalWebhooks = await prisma.webhookEvent.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })

    res.status(200).json({
      success: true,
      data: {
        totalWebhooks,
        stats: webhookStats,
        timestamp: new Date().toISOString()
      }
    })

    await prisma.$disconnect()
  } catch (error) {
    logger.error('Webhook status error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Backward compatibility route
router.post("/shopify", verifyShopifyWebhook, extractTenant, async (req, res) => {
  // Redirect to main handler
  req.url = '/'
  return router.handle(req, res)
})

module.exports = router
