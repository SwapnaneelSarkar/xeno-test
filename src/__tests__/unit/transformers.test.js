const crypto = require('crypto')
const { transformOrderData, transformProductData, transformCustomerData } = require('../../utils/transformers')

describe('Data Transformers', () => {
  describe('transformOrderData', () => {
    it('should transform Shopify order data correctly', () => {
      const shopifyOrder = {
        id: 12345,
        order_number: 'TEST-001',
        email: 'test@example.com',
        total_price: '99.99',
        subtotal_price: '89.99',
        total_tax: '10.00',
        currency: 'USD',
        financial_status: 'paid',
        fulfillment_status: 'fulfilled',
        created_at: '2025-01-01T00:00:00Z',
        customer: {
          id: 67890,
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe'
        }
      }

      const result = transformOrderData(shopifyOrder, 'tenant-123')

      expect(result).toEqual({
        shopifyId: '12345',
        customerShopifyId: '67890',
        orderNumber: 'TEST-001',
        email: 'test@example.com',
        totalPrice: '99.99',
        subtotalPrice: '89.99',
        taxPrice: '10.00',
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        tenantId: 'tenant-123'
      })
    })

    it('should handle missing optional fields', () => {
      const shopifyOrder = {
        id: 12345,
        order_number: 'TEST-001',
        email: 'test@example.com',
        total_price: '99.99',
        currency: 'USD',
        financial_status: 'paid',
        created_at: '2025-01-01T00:00:00Z',
        customer: {
          id: 67890,
          email: 'test@example.com'
        }
      }

      const result = transformOrderData(shopifyOrder, 'tenant-123')

      expect(result.subtotalPrice).toBeNull()
      expect(result.taxPrice).toBeNull()
      expect(result.fulfillmentStatus).toBeNull()
    })
  })

  describe('transformProductData', () => {
    it('should transform Shopify product data correctly', () => {
      const shopifyProduct = {
        id: 54321,
        title: 'Test Product',
        handle: 'test-product',
        vendor: 'Test Vendor',
        product_type: 'Test Type',
        status: 'active',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      }

      const result = transformProductData(shopifyProduct, 'tenant-123')

      expect(result).toEqual({
        shopifyId: '54321',
        title: 'Test Product',
        handle: 'test-product',
        vendor: 'Test Vendor',
        productType: 'Test Type',
        status: 'active',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        tenantId: 'tenant-123'
      })
    })
  })

  describe('transformCustomerData', () => {
    it('should transform Shopify customer data correctly', () => {
      const shopifyCustomer = {
        id: 98765,
        email: 'customer@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+1234567890',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      }

      const result = transformCustomerData(shopifyCustomer, 'tenant-123')

      expect(result).toEqual({
        shopifyId: '98765',
        email: 'customer@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567890',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        tenantId: 'tenant-123'
      })
    })
  })
})
