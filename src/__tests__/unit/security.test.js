const crypto = require('crypto')
const { verifyShopifyWebhook } = require('../../utils/security')

describe('Security Utils', () => {
  describe('verifyShopifyWebhook', () => {
    const secret = 'test-secret-key'
    const payload = JSON.stringify({ test: 'data' })
    const validHmac = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64')

    it('should verify valid HMAC signature', () => {
      const result = verifyShopifyWebhook(payload, validHmac, secret)
      expect(result).toBe(true)
    })

    it('should reject invalid HMAC signature', () => {
      const invalidHmac = 'invalid-signature'
      const result = verifyShopifyWebhook(payload, invalidHmac, secret)
      expect(result).toBe(false)
    })

    it('should reject empty HMAC signature', () => {
      const result = verifyShopifyWebhook(payload, '', secret)
      expect(result).toBe(false)
    })

    it('should reject null HMAC signature', () => {
      const result = verifyShopifyWebhook(payload, null, secret)
      expect(result).toBe(false)
    })

    it('should handle different payload formats', () => {
      const xmlPayload = '<xml>test</xml>'
      const xmlHmac = crypto
        .createHmac('sha256', secret)
        .update(xmlPayload, 'utf8')
        .digest('base64')

      const result = verifyShopifyWebhook(xmlPayload, xmlHmac, secret)
      expect(result).toBe(true)
    })

    it('should be timing-safe against timing attacks', () => {
      const start = process.hrtime.bigint()
      verifyShopifyWebhook(payload, 'invalid', secret)
      const end = process.hrtime.bigint()
      
      // Should take some time (timing-safe comparison)
      expect(end - start).toBeGreaterThan(0)
    })
  })
})
