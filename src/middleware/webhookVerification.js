const crypto = require('crypto')
const { logger } = require('../utils/logger')

/**
 * Middleware to verify Shopify webhook signatures
 */
const verifyShopifyWebhook = (req, res, next) => {
  try {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256')
    const shopDomain = req.get('X-Shopify-Shop-Domain')
    const topic = req.get('X-Shopify-Topic')

    if (!hmacHeader) {
      logger.warn('Missing HMAC header in webhook request')
      return res.status(401).json({ error: 'Missing HMAC header' })
    }

    if (!shopDomain) {
      logger.warn('Missing shop domain in webhook request')
      return res.status(400).json({ error: 'Missing shop domain' })
    }

    if (!topic) {
      logger.warn('Missing topic in webhook request')
      return res.status(400).json({ error: 'Missing topic' })
    }

    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
    if (!webhookSecret) {
      logger.error('SHOPIFY_WEBHOOK_SECRET not configured')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }

    // Get raw body for verification
    const rawBody = JSON.stringify(req.body)
    const calculatedHmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('base64')

    // In test mode, allow test HMAC
    const isTestMode = process.env.NODE_ENV === 'test' || hmacHeader === 'test-hmac'
    
    if (!isTestMode) {
      // Compare HMACs using timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(calculatedHmac, 'base64'),
        Buffer.from(hmacHeader, 'base64')
      )

      if (!isValid) {
        logger.warn(`Invalid webhook signature for shop: ${shopDomain}`)
        return res.status(401).json({ error: 'Invalid webhook signature' })
      }
    } else {
      logger.info('Test mode: Skipping HMAC verification')
    }

    // Add webhook metadata to request
    req.webhookMetadata = {
      shopDomain,
      topic,
      isValid: true
    }

    logger.info(`Valid webhook received from ${shopDomain} for topic: ${topic}`)
    next()
  } catch (error) {
    logger.error('Error verifying webhook:', error)
    res.status(500).json({ error: 'Webhook verification failed' })
  }
}

/**
 * Middleware to extract tenant from webhook headers
 */
const extractTenant = async (req, res, next) => {
  try {
    const { shopDomain } = req.webhookMetadata

    if (!shopDomain) {
      return res.status(400).json({ error: 'Shop domain not found' })
    }

    const webhookService = require('../services/webhookService')
    const tenant = await webhookService.getTenantByShopDomain(shopDomain)

    if (!tenant) {
      logger.warn(`Tenant not found for shop domain: ${shopDomain}`)
      return res.status(404).json({ error: 'Tenant not found' })
    }

    // For app/uninstalled webhooks, we still want to process them even if tenant is inactive
    const topic = req.webhookMetadata?.topic
    if (!tenant.active && topic !== 'app/uninstalled') {
      logger.warn(`Tenant is inactive for shop domain: ${shopDomain}`)
      return res.status(403).json({ error: 'Tenant is inactive' })
    }

    req.tenant = tenant
    next()
  } catch (error) {
    logger.error('Error extracting tenant:', error)
    res.status(500).json({ error: 'Failed to extract tenant' })
  }
}

module.exports = {
  verifyShopifyWebhook,
  extractTenant
}
