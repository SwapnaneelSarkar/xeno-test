const prisma = require("../lib/prisma")
const transformer = require("./transformer")

const SHOPIFY_CONFIG = {
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
  shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
  webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET,
  apiVersion: "2024-01",
}

class ShopifyService {
  constructor() {
    this.baseUrl = `https://${SHOPIFY_CONFIG.shopDomain}/admin/api/${SHOPIFY_CONFIG.apiVersion}`
    this.headers = {
      "X-Shopify-Access-Token": SHOPIFY_CONFIG.accessToken,
      "Content-Type": "application/json",
    }
  }

  async makeShopifyRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const config = {
      headers: this.headers,
      ...options,
    }

    try {
      const response = await fetch(url, config)
      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
      }
      return await response.json()
    } catch (error) {
      console.error(`Shopify API request failed: ${endpoint}`, error)
      throw error
    }
  }

  async getStores() {
    // TODO: Implement store retrieval from database
    console.log("ShopifyService.getStores() - not implemented yet")
    return []
  }

  async createStore(storeData) {
    // TODO: Implement store creation in database
    console.log("ShopifyService.createStore() - not implemented yet", storeData)
    return { id: "placeholder", ...storeData }
  }

  async getProducts(storeId) {
    try {
      console.log(`Fetching products for store: ${storeId}`)
      const response = await this.makeShopifyRequest("/products.json")
      const products = response.products || []

      // Transform and store products using transformer service
      const transformedProducts = await transformer.transformProducts(products)

      // TODO: Store products in database
      console.log(`Retrieved ${products.length} products from Shopify`)
      return transformedProducts
    } catch (error) {
      console.error(`Failed to fetch products for store ${storeId}:`, error)
      throw error
    }
  }

  async getOrders(storeId) {
    try {
      console.log(`Fetching orders for store: ${storeId}`)
      const response = await this.makeShopifyRequest("/orders.json")
      const orders = response.orders || []

      // Transform and store orders using transformer service
      const transformedOrders = await transformer.transformOrders(orders)

      // TODO: Store orders in database
      console.log(`Retrieved ${orders.length} orders from Shopify`)
      return transformedOrders
    } catch (error) {
      console.error(`Failed to fetch orders for store ${storeId}:`, error)
      throw error
    }
  }

  async syncStore(storeId) {
    try {
      console.log(`Starting full sync for store: ${storeId}`)

      // Sync products
      const products = await this.getProducts(storeId)

      // Sync orders
      const orders = await this.getOrders(storeId)

      // Sync customers
      const customersResponse = await this.makeShopifyRequest("/customers.json")
      const customers = customersResponse.customers || []

      console.log(
        `Sync completed - Products: ${products.length}, Orders: ${orders.length}, Customers: ${customers.length}`,
      )

      return {
        success: true,
        synced: {
          products: products.length,
          orders: orders.length,
          customers: customers.length,
        },
      }
    } catch (error) {
      console.error(`Store sync failed for ${storeId}:`, error)
      throw error
    }
  }

  async handleWebhook(type, data) {
    // TODO: Implement webhook processing
    console.log(`ShopifyService.handleWebhook(${type}) - not implemented yet`, data)
    return { processed: true }
  }

  verifyWebhook(rawBody, signature) {
    const crypto = require("crypto")
    const hmac = crypto.createHmac("sha256", SHOPIFY_CONFIG.webhookSecret)
    hmac.update(rawBody, "utf8")
    const calculatedSignature = hmac.digest("base64")

    return calculatedSignature === signature
  }
}

module.exports = new ShopifyService()
