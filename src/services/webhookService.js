const { PrismaClient } = require('@prisma/client')
const logger = require('../utils/logger')

const prisma = new PrismaClient()

class WebhookService {
  /**
   * Process order webhook from Shopify
   */
  async processOrderWebhook(webhookData, tenantId) {
    try {
      const { id, order_number, email, total_price, subtotal_price, tax_price, currency, financial_status, fulfillment_status, customer } = webhookData

      // Find or create customer if exists
      let customerId = null
      if (customer && customer.id) {
        const existingCustomer = await prisma.customer.findUnique({
          where: {
            tenantId_shopifyId: {
              tenantId,
              shopifyId: customer.id.toString()
            }
          }
        })

        if (existingCustomer) {
          customerId = existingCustomer.id
        } else if (customer.email) {
          // Create customer if not exists
          const newCustomer = await prisma.customer.create({
            data: {
              tenantId,
              shopifyId: customer.id.toString(),
              email: customer.email,
              firstName: customer.first_name,
              lastName: customer.last_name,
              phone: customer.phone
            }
          })
          customerId = newCustomer.id
        }
      }

      // Upsert order
      const order = await prisma.order.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId,
            shopifyId: id.toString()
          }
        },
        update: {
          customerShopifyId: customer?.id?.toString() || null,
          customerId,
          orderNumber: order_number,
          email,
          totalPrice: parseFloat(total_price),
          subtotalPrice: subtotal_price ? parseFloat(subtotal_price) : null,
          taxPrice: tax_price ? parseFloat(tax_price) : null,
          currency: currency || 'USD',
          financialStatus: financial_status,
          fulfillmentStatus: fulfillment_status
        },
        create: {
          tenantId,
          shopifyId: id.toString(),
          customerShopifyId: customer?.id?.toString() || null,
          customerId,
          orderNumber: order_number,
          email,
          totalPrice: parseFloat(total_price),
          subtotalPrice: subtotal_price ? parseFloat(subtotal_price) : null,
          taxPrice: tax_price ? parseFloat(tax_price) : null,
          currency: currency || 'USD',
          financialStatus: financial_status,
          fulfillmentStatus: fulfillment_status
        }
      })

      logger.info(`Order webhook processed: ${order.id}`)
      return { success: true, data: order }
    } catch (error) {
      logger.error('Error processing order webhook:', error)
      throw error
    }
  }

  /**
   * Process product webhook from Shopify
   */
  async processProductWebhook(webhookData, tenantId) {
    try {
      const { id, title, handle, body_html, vendor, product_type, tags, variants } = webhookData

      // Get price from first variant
      const price = variants && variants.length > 0 ? parseFloat(variants[0].price) : null
      const sku = variants && variants.length > 0 ? variants[0].sku : null

      const product = await prisma.product.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId,
            shopifyId: id.toString()
          }
        },
        update: {
          title,
          handle,
          description: body_html,
          vendor,
          productType: product_type,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          price,
          sku
        },
        create: {
          tenantId,
          shopifyId: id.toString(),
          title,
          handle,
          description: body_html,
          vendor,
          productType: product_type,
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          price,
          sku
        }
      })

      logger.info(`Product webhook processed: ${product.id}`)
      return { success: true, data: product }
    } catch (error) {
      logger.error('Error processing product webhook:', error)
      throw error
    }
  }

  /**
   * Process customer webhook from Shopify
   */
  async processCustomerWebhook(webhookData, tenantId) {
    try {
      const { id, email, first_name, last_name, phone } = webhookData

      const customer = await prisma.customer.upsert({
        where: {
          tenantId_shopifyId: {
            tenantId,
            shopifyId: id.toString()
          }
        },
        update: {
          email,
          firstName: first_name,
          lastName: last_name,
          phone
        },
        create: {
          tenantId,
          shopifyId: id.toString(),
          email,
          firstName: first_name,
          lastName: last_name,
          phone
        }
      })

      logger.info(`Customer webhook processed: ${customer.id}`)
      return { success: true, data: customer }
    } catch (error) {
      logger.error('Error processing customer webhook:', error)
      throw error
    }
  }

  /**
   * Log webhook event to database with idempotency
   */
  async logWebhookEvent(tenantId, shopifyId, topic, payload, processed = false, errorMessage = null) {
    try {
      await prisma.webhookEvent.upsert({
        where: { 
          tenantId_topic_shopifyId: {
            tenantId: tenantId || null,
            topic,
            shopifyId
          }
        },
        update: {
          processed,
          processedAt: processed ? new Date() : null,
          errorMessage,
          payload // Update payload in case of retry
        },
        create: {
          tenantId,
          shopifyId,
          topic,
          payload,
          processed,
          processedAt: processed ? new Date() : null,
          errorMessage
        }
      })
    } catch (error) {
      logger.error('Error logging webhook event:', error)
    }
  }

  /**
   * Check if webhook event already processed (idempotency check)
   */
  async isWebhookProcessed(tenantId, shopifyId, topic) {
    try {
      const event = await prisma.webhookEvent.findUnique({
        where: {
          tenantId_topic_shopifyId: {
            tenantId: tenantId || null,
            topic,
            shopifyId
          }
        }
      })
      return event ? event.processed : false
    } catch (error) {
      logger.error('Error checking webhook processing status:', error)
      return false
    }
  }

  /**
   * Get tenant by shop domain from webhook headers
   */
  async getTenantByShopDomain(shopDomain) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { shopDomain }
      })
      return tenant
    } catch (error) {
      logger.error('Error finding tenant by shop domain:', error)
      return null
    }
  }

  /**
   * Process app uninstalled webhook
   */
  async processAppUninstalledWebhook(webhookData, tenantId) {
    try {
      // Deactivate tenant and remove access token
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { 
          accessToken: null,
          active: false
        }
      })

      logger.info(`App uninstalled for tenant: ${tenantId}, shop: ${tenant.shopDomain}`)
      
      // TODO: Add cleanup for scheduled jobs, cached data, etc.
      // This is where you would remove any background jobs, clear caches, etc.
      
      return { success: true, data: { tenantId, action: 'deactivated' } }
    } catch (error) {
      logger.error('Error processing app uninstalled webhook:', error)
      throw error
    }
  }

  /**
   * Process webhook based on topic
   */
  async processWebhook(topic, webhookData, tenantId) {
    try {
      let result

      switch (topic) {
        case 'orders/create':
        case 'orders/updated':
        case 'orders/paid':
        case 'orders/cancelled':
        case 'orders/fulfilled':
          result = await this.processOrderWebhook(webhookData, tenantId)
          break

        case 'products/create':
        case 'products/update':
          result = await this.processProductWebhook(webhookData, tenantId)
          break

        case 'customers/create':
        case 'customers/update':
          result = await this.processCustomerWebhook(webhookData, tenantId)
          break

        case 'app/uninstalled':
          result = await this.processAppUninstalledWebhook(webhookData, tenantId)
          break

        default:
          logger.warn(`Unhandled webhook topic: ${topic}`)
          return { success: false, message: 'Unhandled webhook topic' }
      }

      return result
    } catch (error) {
      logger.error(`Error processing webhook topic ${topic}:`, error)
      throw error
    }
  }
}

module.exports = new WebhookService()
