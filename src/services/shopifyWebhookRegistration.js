const axios = require('axios')
const logger = require('../utils/logger')

class ShopifyWebhookRegistration {
  constructor() {
    this.baseUrl = 'https://api.shopify.com/admin/api/2023-10'
  }

  /**
   * Register webhooks for a Shopify store
   */
  async registerWebhooks(shopDomain, accessToken) {
    const webhooks = [
      {
        topic: 'orders/create',
        address: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/shopify`,
        format: 'json'
      },
      {
        topic: 'orders/updated',
        address: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/shopify`,
        format: 'json'
      },
      {
        topic: 'orders/paid',
        address: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/shopify`,
        format: 'json'
      },
      {
        topic: 'orders/cancelled',
        address: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/shopify`,
        format: 'json'
      },
      {
        topic: 'orders/fulfilled',
        address: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/shopify`,
        format: 'json'
      },
      {
        topic: 'products/create',
        address: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/shopify`,
        format: 'json'
      },
      {
        topic: 'products/update',
        address: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/shopify`,
        format: 'json'
      },
      {
        topic: 'customers/create',
        address: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/shopify`,
        format: 'json'
      },
      {
        topic: 'customers/update',
        address: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/shopify`,
        format: 'json'
      },
      {
        topic: 'app/uninstalled',
        address: `${process.env.WEBHOOK_BASE_URL || 'https://your-domain.com'}/api/webhooks/shopify`,
        format: 'json'
      }
    ]

    const results = []
    const shopUrl = `https://${shopDomain}`

    for (const webhook of webhooks) {
      try {
        // Check if webhook already exists
        const existingWebhooks = await this.getWebhooks(shopDomain, accessToken)
        const existingWebhook = existingWebhooks.find(w => w.topic === webhook.topic)

        if (existingWebhook) {
          logger.info(`Webhook ${webhook.topic} already exists for ${shopDomain}`)
          results.push({
            topic: webhook.topic,
            status: 'exists',
            webhookId: existingWebhook.id
          })
          continue
        }

        // Create new webhook
        const response = await axios.post(
          `${shopUrl}/admin/api/2023-10/webhooks.json`,
          { webhook },
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json'
            }
          }
        )

        logger.info(`Webhook ${webhook.topic} registered for ${shopDomain}`)
        results.push({
          topic: webhook.topic,
          status: 'created',
          webhookId: response.data.webhook.id
        })
      } catch (error) {
        logger.error(`Failed to register webhook ${webhook.topic} for ${shopDomain}:`, error.response?.data || error.message)
        results.push({
          topic: webhook.topic,
          status: 'failed',
          error: error.response?.data?.errors || error.message
        })
      }
    }

    return results
  }

  /**
   * Get existing webhooks for a store
   */
  async getWebhooks(shopDomain, accessToken) {
    try {
      const shopUrl = `https://${shopDomain}`
      const response = await axios.get(
        `${shopUrl}/admin/api/2023-10/webhooks.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data.webhooks
    } catch (error) {
      logger.error(`Failed to get webhooks for ${shopDomain}:`, error.response?.data || error.message)
      throw error
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(shopDomain, accessToken, webhookId) {
    try {
      const shopUrl = `https://${shopDomain}`
      await axios.delete(
        `${shopUrl}/admin/api/2023-10/webhooks/${webhookId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      )

      logger.info(`Webhook ${webhookId} deleted for ${shopDomain}`)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to delete webhook ${webhookId} for ${shopDomain}:`, error.response?.data || error.message)
      throw error
    }
  }

  /**
   * Delete all webhooks for a store
   */
  async deleteAllWebhooks(shopDomain, accessToken) {
    try {
      const webhooks = await this.getWebhooks(shopDomain, accessToken)
      const results = []

      for (const webhook of webhooks) {
        try {
          await this.deleteWebhook(shopDomain, accessToken, webhook.id)
          results.push({
            webhookId: webhook.id,
            topic: webhook.topic,
            status: 'deleted'
          })
        } catch (error) {
          results.push({
            webhookId: webhook.id,
            topic: webhook.topic,
            status: 'failed',
            error: error.message
          })
        }
      }

      return results
    } catch (error) {
      logger.error(`Failed to delete all webhooks for ${shopDomain}:`, error.message)
      throw error
    }
  }
}

module.exports = new ShopifyWebhookRegistration()
