const request = require('supertest')
const crypto = require('crypto')
const app = require('../../app')

describe('Webhook Integration Tests', () => {
  let testTenant
  const webhookSecret = 'test-webhook-secret'

  beforeAll(async () => {
    console.log('Webhook test beforeAll running, global.prisma exists:', !!global.prisma)
    if (global.prisma) {
      console.log('Global Prisma client datasource URL:', global.prisma._engine?.datasources?.db?.url || 'unknown')
    }
    
    // Set the correct database URL for the webhook service
    const testDatabaseUrl = process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:3002/xeno_fde_test'
    process.env.DATABASE_URL = testDatabaseUrl
    console.log('Set DATABASE_URL to:', testDatabaseUrl)
    
    // Use the same Prisma client as the webhook service
    const { PrismaClient } = require('@prisma/client')
    console.log('Creating test Prisma client with URL:', testDatabaseUrl)
    
    const testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl
        }
      }
    })
    
    // Create or find test tenant
    testTenant = await testPrisma.tenant.upsert({
      where: { email: 'test@shop.com' },
      update: {},
      create: {
        name: 'Test Shop',
        email: 'test@shop.com',
        shopDomain: 'test-shop.myshopify.com',
        accessToken: 'test-token',
        active: true
      }
    })
    
    // Verify tenant was created
    console.log('Test tenant created:', testTenant)
    
    // Clean up any existing webhook events for this tenant
    await testPrisma.webhookEvent.deleteMany({
      where: { tenantId: testTenant.id }
    })
    
    // Store the test Prisma client for cleanup
    global.testPrisma = testPrisma
  })

  afterAll(async () => {
    // Clean up test tenant
    if (testTenant && global.testPrisma) {
      try {
        await global.testPrisma.tenant.delete({
          where: { id: testTenant.id }
        })
      } catch (error) {
        // Ignore cleanup errors - tenant might already be deleted
        console.warn('Cleanup warning:', error.message)
      }
    }
    
    // Disconnect test Prisma client
    if (global.testPrisma) {
      await global.testPrisma.$disconnect()
    }
  })

  describe('POST /api/webhooks', () => {
    const createWebhookSignature = (payload, secret) => {
      return crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('base64')
    }

    it('should process order webhook successfully', async () => {
      const orderPayload = {
        id: 12345,
        order_number: 'TEST-001',
        email: 'test@example.com',
        total_price: '99.99',
        currency: 'USD',
        financial_status: 'paid',
        created_at: new Date().toISOString(),
        customer: {
          id: 67890,
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe'
        }
      }

      const payload = JSON.stringify(orderPayload)
      const hmac = 'test-hmac' // Use test HMAC for test mode

      const response = await request(app)
        .post('/api/webhooks')
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('Content-Type', 'application/json')
        .send(payload)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // Debug: Check database immediately after webhook
      process.stdout.write('Checking database immediately after webhook...\n')
      const allOrders = await global.testPrisma.order.findMany()
      process.stdout.write(`All orders: ${JSON.stringify(allOrders)}\n`)
      const allWebhookEvents = await global.testPrisma.webhookEvent.findMany()
      process.stdout.write(`All webhook events: ${JSON.stringify(allWebhookEvents)}\n`)

      // Verify data was stored
      const order = await global.testPrisma.order.findFirst({
        where: { shopifyId: '12345' }
      })
      expect(order).toBeTruthy()
      expect(order.orderNumber).toBe('TEST-001')
    })

    it('should reject webhook with invalid HMAC', async () => {
      const orderPayload = {
        id: 12346,
        order_number: 'TEST-002',
        email: 'test@example.com',
        total_price: '99.99',
        currency: 'USD',
        financial_status: 'paid',
        created_at: new Date().toISOString()
      }

      const payload = JSON.stringify(orderPayload)
      const invalidHmac = 'invalid-signature'

      const response = await request(app)
        .post('/api/webhooks')
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .set('X-Shopify-Hmac-Sha256', invalidHmac)
        .set('Content-Type', 'application/json')
        .send(payload)

      expect(response.status).toBe(401)
      expect(response.body.error).toContain('Invalid webhook signature')
    })

    it('should handle idempotent webhook processing', async () => {
      const orderPayload = {
        id: 12347,
        order_number: 'TEST-003',
        email: 'test@example.com',
        total_price: '99.99',
        currency: 'USD',
        financial_status: 'paid',
        created_at: new Date().toISOString(),
        customer: {
          id: 67890,
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe'
        }
      }

      const payload = JSON.stringify(orderPayload)
      const hmac = 'test-hmac' // Use test HMAC for test mode

      // First request
      const response1 = await request(app)
        .post('/api/webhooks')
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('Content-Type', 'application/json')
        .send(payload)

      expect(response1.status).toBe(200)

      // Second request (should be idempotent)
      const response2 = await request(app)
        .post('/api/webhooks')
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('Content-Type', 'application/json')
        .send(payload)

      expect(response2.status).toBe(200)
      expect(response2.body.idempotent).toBe(true)

      // Should only have one order record
      const orderCount = await global.testPrisma.order.count({
        where: { shopifyId: '12347' }
      })
      expect(orderCount).toBe(1)
    })

    it('should process product webhook successfully', async () => {
      const productPayload = {
        id: 54321,
        title: 'Test Product',
        handle: 'test-product',
        vendor: 'Test Vendor',
        product_type: 'Test Type',
        status: 'active',
        created_at: new Date().toISOString()
      }

      const payload = JSON.stringify(productPayload)
      const hmac = 'test-hmac' // Use test HMAC for test mode

      const response = await request(app)
        .post('/api/webhooks')
        .set('X-Shopify-Topic', 'products/create')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('Content-Type', 'application/json')
        .send(payload)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // Verify data was stored
      const product = await global.testPrisma.product.findFirst({
        where: { shopifyId: '54321' }
      })
      expect(product).toBeTruthy()
      expect(product.title).toBe('Test Product')
    })
  })
})
