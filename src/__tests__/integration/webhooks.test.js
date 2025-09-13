const request = require('supertest')
const crypto = require('crypto')
const app = require('../../app')

describe('Webhook Integration Tests', () => {
  let testTenant
  const webhookSecret = 'test-webhook-secret'

  beforeAll(async () => {
    // Create test tenant
    testTenant = await global.prisma.tenant.create({
      data: {
        name: 'Test Shop',
        email: 'test@shop.com',
        shopDomain: 'test-shop.myshopify.com',
        accessToken: 'test-token',
        active: true
      }
    })
  })

  afterAll(async () => {
    // Clean up test tenant
    if (testTenant) {
      await global.prisma.tenant.delete({
        where: { id: testTenant.id }
      })
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
      const hmac = createWebhookSignature(payload, webhookSecret)

      const response = await request(app)
        .post('/api/webhooks')
        .set('X-Shopify-Topic', 'orders/create')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('Content-Type', 'application/json')
        .send(payload)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // Verify data was stored
      const order = await global.prisma.order.findFirst({
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
      const hmac = createWebhookSignature(payload, webhookSecret)

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
      const orderCount = await global.prisma.order.count({
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
      const hmac = createWebhookSignature(payload, webhookSecret)

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
      const product = await global.prisma.product.findFirst({
        where: { shopifyId: '54321' }
      })
      expect(product).toBeTruthy()
      expect(product.title).toBe('Test Product')
    })
  })
})
