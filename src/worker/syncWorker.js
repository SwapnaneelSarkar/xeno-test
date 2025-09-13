const cron = require('node-cron')
const axios = require('axios')
const { PrismaClient } = require('@prisma/client')
const webhookService = require('../services/webhookService')
const logger = require('../utils/logger')

const prisma = new PrismaClient()

class SyncWorker {
  constructor() {
    this.isRunning = false
    this.rateLimitDelay = 1000 // Base delay in ms
  }

  /**
   * Start the sync worker with cron scheduling
   */
  start() {
    logger.info('Starting sync worker...')
    
    // Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      if (this.isRunning) {
        logger.warn('Sync worker already running, skipping this cycle')
        return
      }
      
      await this.runSync()
    })

    // Also run immediately on startup (optional)
    setTimeout(() => {
      this.runSync()
    }, 5000) // Wait 5 seconds after startup

    logger.info('Sync worker started - will run every 15 minutes')
  }

  /**
   * Main sync process
   */
  async runSync() {
    this.isRunning = true
    logger.info('Starting reconciliation sync...')

    try {
      const tenants = await prisma.tenant.findMany({ 
        where: { 
          active: true,
          accessToken: { not: null }
        } 
      })

      logger.info(`Found ${tenants.length} active tenants to sync`)

      for (const tenant of tenants) {
        try {
          await this.syncTenant(tenant)
        } catch (error) {
          logger.error(`Failed to sync tenant ${tenant.id} (${tenant.shopDomain}):`, error)
        }
      }

      logger.info('Reconciliation sync completed')
    } catch (error) {
      logger.error('Sync worker error:', error)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Sync a specific tenant
   */
  async syncTenant(tenant) {
    logger.info(`Syncing tenant: ${tenant.shopDomain}`)

    try {
      // Sync orders
      await this.syncOrdersForTenant(tenant)
      
      // Sync products
      await this.syncProductsForTenant(tenant)
      
      // Sync customers
      await this.syncCustomersForTenant(tenant)

      logger.info(`Completed sync for tenant: ${tenant.shopDomain}`)
    } catch (error) {
      logger.error(`Error syncing tenant ${tenant.shopDomain}:`, error)
      throw error
    }
  }

  /**
   * Sync orders for a tenant
   */
  async syncOrdersForTenant(tenant) {
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-01'
    const baseUrl = `https://${tenant.shopDomain}/admin/api/${apiVersion}/orders.json`
    let url = `${baseUrl}?status=any&limit=250`
    
    // Add date filter if we have last sync time
    if (tenant.lastOrderSync) {
      url += `&updated_at_min=${tenant.lastOrderSync.toISOString()}`
    }

    let hasMore = true
    let totalSynced = 0

    while (hasMore && url) {
      try {
        const response = await this.makeShopifyRequest(url, tenant.accessToken)
        const orders = response.data.orders || []

        logger.info(`Processing ${orders.length} orders for ${tenant.shopDomain}`)

        for (const order of orders) {
          try {
            // Process order using the same logic as webhooks
            await webhookService.processOrderWebhook(order, tenant.id)
            totalSynced++
          } catch (error) {
            logger.error(`Failed to process order ${order.id}:`, error)
          }
        }

        // Handle pagination
        url = this.getNextPageUrl(response.headers.link)
        hasMore = !!url

        // Rate limiting
        await this.handleRateLimit(response.headers)

      } catch (error) {
        logger.error(`Error fetching orders for ${tenant.shopDomain}:`, error)
        break
      }
    }

    // Update last sync time
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { lastOrderSync: new Date() }
    })

    logger.info(`Synced ${totalSynced} orders for ${tenant.shopDomain}`)
  }

  /**
   * Sync products for a tenant
   */
  async syncProductsForTenant(tenant) {
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-01'
    const baseUrl = `https://${tenant.shopDomain}/admin/api/${apiVersion}/products.json`
    let url = `${baseUrl}?limit=250`
    
    // Add date filter if we have last sync time
    if (tenant.lastProductSync) {
      url += `&updated_at_min=${tenant.lastProductSync.toISOString()}`
    }

    let hasMore = true
    let totalSynced = 0

    while (hasMore && url) {
      try {
        const response = await this.makeShopifyRequest(url, tenant.accessToken)
        const products = response.data.products || []

        logger.info(`Processing ${products.length} products for ${tenant.shopDomain}`)

        for (const product of products) {
          try {
            await webhookService.processProductWebhook(product, tenant.id)
            totalSynced++
          } catch (error) {
            logger.error(`Failed to process product ${product.id}:`, error)
          }
        }

        url = this.getNextPageUrl(response.headers.link)
        hasMore = !!url

        await this.handleRateLimit(response.headers)

      } catch (error) {
        logger.error(`Error fetching products for ${tenant.shopDomain}:`, error)
        break
      }
    }

    // Update last sync time
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { lastProductSync: new Date() }
    })

    logger.info(`Synced ${totalSynced} products for ${tenant.shopDomain}`)
  }

  /**
   * Sync customers for a tenant
   */
  async syncCustomersForTenant(tenant) {
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-01'
    const baseUrl = `https://${tenant.shopDomain}/admin/api/${apiVersion}/customers.json`
    let url = `${baseUrl}?limit=250`
    
    // Add date filter if we have last sync time
    if (tenant.lastCustomerSync) {
      url += `&updated_at_min=${tenant.lastCustomerSync.toISOString()}`
    }

    let hasMore = true
    let totalSynced = 0

    while (hasMore && url) {
      try {
        const response = await this.makeShopifyRequest(url, tenant.accessToken)
        const customers = response.data.customers || []

        logger.info(`Processing ${customers.length} customers for ${tenant.shopDomain}`)

        for (const customer of customers) {
          try {
            await webhookService.processCustomerWebhook(customer, tenant.id)
            totalSynced++
          } catch (error) {
            logger.error(`Failed to process customer ${customer.id}:`, error)
          }
        }

        url = this.getNextPageUrl(response.headers.link)
        hasMore = !!url

        await this.handleRateLimit(response.headers)

      } catch (error) {
        logger.error(`Error fetching customers for ${tenant.shopDomain}:`, error)
        break
      }
    }

    // Update last sync time
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { lastCustomerSync: new Date() }
    })

    logger.info(`Synced ${totalSynced} customers for ${tenant.shopDomain}`)
  }

  /**
   * Make a request to Shopify API with proper headers
   */
  async makeShopifyRequest(url, accessToken) {
    return await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * Extract next page URL from Link header
   */
  getNextPageUrl(linkHeader) {
    if (!linkHeader) return null

    const links = linkHeader.split(',')
    for (const link of links) {
      const [url, rel] = link.split(';')
      if (rel && rel.includes('next')) {
        return url.trim().replace(/[<>]/g, '')
      }
    }
    return null
  }

  /**
   * Handle Shopify rate limiting
   */
  async handleRateLimit(headers) {
    const callLimit = headers['x-shopify-shop-api-call-limit']
    if (!callLimit) return

    const [used, limit] = callLimit.split('/').map(Number)
    const usagePercent = (used / limit) * 100

    // If we're using more than 80% of the rate limit, wait
    if (usagePercent > 80) {
      const waitTime = this.rateLimitDelay * (usagePercent / 100)
      logger.info(`Rate limit at ${usagePercent.toFixed(1)}%, waiting ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  /**
   * Stop the sync worker
   */
  stop() {
    logger.info('Stopping sync worker...')
    cron.destroy()
  }
}

// Create and export worker instance
const syncWorker = new SyncWorker()

// Start worker if this file is run directly
if (require.main === module) {
  syncWorker.start()
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...')
    syncWorker.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...')
    syncWorker.stop()
    process.exit(0)
  })
}

module.exports = syncWorker
