const express = require("express")
const router = express.Router()
const shopifyService = require("../services/shopifyService")
const axios = require('axios')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const shopifyWebhookRegistration = require('../services/shopifyWebhookRegistration')
const { authenticateToken, tenantIsolation } = require("../middleware/auth")
const logger = require('../utils/logger')

const prisma = new PrismaClient()

function generateState() {
  return crypto.randomBytes(16).toString('hex')
}

// OAuth Install Route
router.get("/install", (req, res) => {
  const shop = req.query.shop
  if (!shop) {
    return res.status(400).send('Missing shop parameter')
  }

  // Validate shop domain format
  if (!shop.includes('.myshopify.com')) {
    return res.status(400).send('Invalid shop domain format')
  }

  const state = generateState()
  
  // Store state in cookie for CSRF protection
  res.cookie('shopify_state', state, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600000 // 10 minutes
  })

  const scopes = process.env.SHOPIFY_SCOPES || 'read_products,read_orders,read_customers,write_webhooks'
  const redirectUri = `${process.env.BACKEND_BASE_URL}/api/shopify/callback`
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}` +
    `&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  logger.info(`Redirecting to Shopify OAuth for shop: ${shop}`)
  res.redirect(installUrl)
})

// OAuth Callback Route
router.get("/callback", async (req, res) => {
  const { shop, code, state } = req.query
  
  if (!shop || !code || !state) {
    return res.status(400).send('Missing required parameters')
  }

  // Validate state to prevent CSRF
  const storedState = req.cookies.shopify_state
  if (!storedState || storedState !== state) {
    return res.status(400).send('Invalid state parameter')
  }

  try {
    // Exchange code for access token
    const tokenResp = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code
    })

    const accessToken = tokenResp.data.access_token

    // Upsert tenant/store in DB
    const tenant = await prisma.tenant.upsert({
      where: { shopDomain: shop },
      update: { 
        accessToken,
        active: true
      },
      create: { 
        name: shop, 
        email: `${shop}@shopify.com`, 
        shopDomain: shop, 
        accessToken,
        active: true
      }
    })

    // Register webhooks for the shop
    try {
      await registerWebhooksForShop(shop, accessToken)
      logger.info(`Webhooks registered successfully for shop: ${shop}`)
    } catch (webhookError) {
      logger.error(`Failed to register webhooks for shop ${shop}:`, webhookError)
      // Don't fail the OAuth flow if webhook registration fails
    }

    // Clear the state cookie
    res.clearCookie('shopify_state')

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000'
    res.redirect(`${frontendUrl}/?install=success&shop=${encodeURIComponent(shop)}`)

  } catch (error) {
    logger.error('OAuth error:', error.response?.data || error.message)
    res.status(500).send('OAuth exchange failed')
  }
})

// Helper function to register webhooks for a shop
async function registerWebhooksForShop(shop, token) {
  const apiVer = process.env.SHOPIFY_API_VERSION || '2025-01'
  const topics = [
    'orders/create',
    'orders/updated', 
    'orders/paid',
    'orders/cancelled',
    'orders/fulfilled',
    'products/create',
    'products/update',
    'customers/create',
    'customers/update',
    'app/uninstalled'
  ]

  for (const topic of topics) {
    try {
      await axios.post(`https://${shop}/admin/api/${apiVer}/webhooks.json`,
        { 
          webhook: { 
            topic, 
            address: `${process.env.BACKEND_BASE_URL}/api/webhooks/shopify`, 
            format: 'json' 
          } 
        },
        { 
          headers: { 
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json'
          } 
        }
      )
      logger.info(`Webhook ${topic} registered for ${shop}`)
    } catch (err) {
      // Ignore if webhook already exists, log otherwise
      if (err.response?.status !== 422) { // 422 means webhook already exists
        logger.warn(`Failed to register webhook ${topic} for ${shop}:`, err.response?.data || err.message)
      }
    }
  }
}

// GET /api/shopify/orders - Paginated orders list
router.get("/orders", authenticateToken, tenantIsolation, async (req, res) => {
  try {
    const { page = 1, limit = 25, from, to, status } = req.query
    const tenantId = req.tenantId
    
    const where = { tenantId }
    
    // Add date filters
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }
    
    // Add status filters
    if (status) {
      where.financialStatus = status
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shopifyId: true,
          orderNumber: true,
          email: true,
          totalPrice: true,
          subtotalPrice: true,
          taxPrice: true,
          currency: true,
          financialStatus: true,
          fulfillmentStatus: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.order.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / take)

    res.json({
      success: true,
      data: {
        orders: orders.map(order => ({
          ...order,
          totalPrice: parseFloat(order.totalPrice),
          subtotalPrice: order.subtotalPrice ? parseFloat(order.subtotalPrice) : null,
          taxPrice: order.taxPrice ? parseFloat(order.taxPrice) : null
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    })
  } catch (error) {
    logger.error('Orders list error:', error)
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
})

// GET /api/shopify/products - Paginated products list
router.get("/products", authenticateToken, tenantIsolation, async (req, res) => {
  try {
    const { page = 1, limit = 25, search, vendor, productType, status } = req.query
    const tenantId = req.tenantId
    
    const where = { tenantId }
    
    // Add search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { handle: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    // Add filters
    if (vendor) where.vendor = vendor
    if (productType) where.productType = productType
    if (status) where.status = status

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shopifyId: true,
          title: true,
          sku: true,
          price: true,
          handle: true,
          description: true,
          vendor: true,
          productType: true,
          tags: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.product.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / take)

    res.json({
      success: true,
      data: {
        products: products.map(product => ({
          ...product,
          price: product.price ? parseFloat(product.price) : null
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    })
  } catch (error) {
    logger.error('Products list error:', error)
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
})

// GET /api/shopify/customers - Paginated customers list
router.get("/customers", authenticateToken, tenantIsolation, async (req, res) => {
  try {
    const { page = 1, limit = 25, search, email } = req.query
    const tenantId = req.tenantId
    
    const where = { tenantId }
    
    // Add search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    // Add email filter
    if (email) {
      where.email = { contains: email, mode: 'insensitive' }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const [customers, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shopifyId: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true
            }
          }
        }
      }),
      prisma.customer.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / take)

    res.json({
      success: true,
      data: {
        customers: customers.map(customer => ({
          ...customer,
          orderCount: customer._count.orders
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    })
  } catch (error) {
    logger.error('Customers list error:', error)
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
})

// GET /api/shopify/stores - Get tenant's stores
router.get("/stores", authenticateToken, tenantIsolation, async (req, res) => {
  try {
    const tenantId = req.tenantId
    
    const stores = await prisma.store.findMany({
      where: { tenantId },
      select: {
        id: true,
        shopDomain: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({
      success: true,
      data: { stores }
    })
  } catch (error) {
    logger.error('Stores list error:', error)
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
})

module.exports = router
