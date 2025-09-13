const { PrismaClient } = require('@prisma/client')

describe('Database Models', () => {
  let prisma

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Tenant Model', () => {
    it('should create tenant with required fields', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Shop',
          email: 'test@shop.com',
          shopDomain: 'test-shop.myshopify.com',
          accessToken: 'test-token',
          active: true
        }
      })

      expect(tenant.id).toBeDefined()
      expect(tenant.name).toBe('Test Shop')
      expect(tenant.email).toBe('test@shop.com')
      expect(tenant.shopDomain).toBe('test-shop.myshopify.com')
      expect(tenant.active).toBe(true)
      expect(tenant.createdAt).toBeDefined()
    })

    it('should enforce unique email constraint', async () => {
      await prisma.tenant.create({
        data: {
          name: 'Test Shop 1',
          email: 'unique@shop.com',
          shopDomain: 'test-shop-1.myshopify.com',
          accessToken: 'test-token-1'
        }
      })

      await expect(
        prisma.tenant.create({
          data: {
            name: 'Test Shop 2',
            email: 'unique@shop.com', // Same email
            shopDomain: 'test-shop-2.myshopify.com',
            accessToken: 'test-token-2'
          }
        })
      ).rejects.toThrow()
    })

    it('should enforce unique shopDomain constraint', async () => {
      await prisma.tenant.create({
        data: {
          name: 'Test Shop 1',
          email: 'unique1@shop.com',
          shopDomain: 'unique-shop.myshopify.com',
          accessToken: 'test-token-1'
        }
      })

      await expect(
        prisma.tenant.create({
          data: {
            name: 'Test Shop 2',
            email: 'unique2@shop.com',
            shopDomain: 'unique-shop.myshopify.com', // Same domain
            accessToken: 'test-token-2'
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('WebhookEvent Model', () => {
    let tenant

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Test Shop',
          email: 'test@shop.com',
          shopDomain: 'test-shop.myshopify.com',
          accessToken: 'test-token'
        }
      })
    })

    it('should create webhook event with required fields', async () => {
      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          tenantId: tenant.id,
          shopifyId: '12345',
          topic: 'orders/create',
          payload: { test: 'data' },
          processed: false
        }
      })

      expect(webhookEvent.id).toBeDefined()
      expect(webhookEvent.tenantId).toBe(tenant.id)
      expect(webhookEvent.shopifyId).toBe('12345')
      expect(webhookEvent.topic).toBe('orders/create')
      expect(webhookEvent.processed).toBe(false)
      expect(webhookEvent.createdAt).toBeDefined()
    })

    it('should enforce unique constraint on tenantId + topic + shopifyId', async () => {
      await prisma.webhookEvent.create({
        data: {
          tenantId: tenant.id,
          shopifyId: '12345',
          topic: 'orders/create',
          payload: { test: 'data' }
        }
      })

      await expect(
        prisma.webhookEvent.create({
          data: {
            tenantId: tenant.id,
            shopifyId: '12345', // Same combination
            topic: 'orders/create',
            payload: { test: 'data' }
          }
        })
      ).rejects.toThrow()
    })

    it('should allow same shopifyId with different tenantId', async () => {
      const tenant2 = await prisma.tenant.create({
        data: {
          name: 'Test Shop 2',
          email: 'test2@shop.com',
          shopDomain: 'test-shop-2.myshopify.com',
          accessToken: 'test-token-2'
        }
      })

      await prisma.webhookEvent.create({
        data: {
          tenantId: tenant.id,
          shopifyId: '12345',
          topic: 'orders/create',
          payload: { test: 'data' }
        }
      })

      // Should not throw
      const webhookEvent2 = await prisma.webhookEvent.create({
        data: {
          tenantId: tenant2.id,
          shopifyId: '12345', // Same shopifyId, different tenant
          topic: 'orders/create',
          payload: { test: 'data' }
        }
      })

      expect(webhookEvent2).toBeDefined()
    })
  })

  describe('Order Model', () => {
    let tenant

    beforeEach(async () => {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Test Shop',
          email: 'test@shop.com',
          shopDomain: 'test-shop.myshopify.com',
          accessToken: 'test-token'
        }
      })
    })

    it('should create order with required fields', async () => {
      const order = await prisma.order.create({
        data: {
          shopifyId: '12345',
          customerShopifyId: '67890',
          orderNumber: 'TEST-001',
          email: 'test@example.com',
          totalPrice: '99.99',
          currency: 'USD',
          financialStatus: 'paid',
          createdAt: new Date(),
          tenantId: tenant.id
        }
      })

      expect(order.id).toBeDefined()
      expect(order.shopifyId).toBe('12345')
      expect(order.orderNumber).toBe('TEST-001')
      expect(order.tenantId).toBe(tenant.id)
    })

    it('should enforce unique constraint on shopifyId + tenantId', async () => {
      await prisma.order.create({
        data: {
          shopifyId: '12345',
          customerShopifyId: '67890',
          orderNumber: 'TEST-001',
          email: 'test@example.com',
          totalPrice: '99.99',
          currency: 'USD',
          financialStatus: 'paid',
          createdAt: new Date(),
          tenantId: tenant.id
        }
      })

      await expect(
        prisma.order.create({
          data: {
            shopifyId: '12345', // Same shopifyId + tenantId
            customerShopifyId: '67890',
            orderNumber: 'TEST-002',
            email: 'test2@example.com',
            totalPrice: '199.99',
            currency: 'USD',
            financialStatus: 'paid',
            createdAt: new Date(),
            tenantId: tenant.id
          }
        })
      ).rejects.toThrow()
    })
  })
})
