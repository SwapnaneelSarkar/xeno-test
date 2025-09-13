const crypto = require('crypto')

/**
 * Verify Shopify webhook HMAC signature using timing-safe comparison
 */
function verifyShopifyWebhook(payload, hmac, secret) {
  if (!hmac || !secret) {
    return false
  }

  try {
    const calculatedHmac = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('base64')

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'base64'),
      Buffer.from(calculatedHmac, 'base64')
    )
  } catch (error) {
    return false
  }
}

/**
 * Generate a secure random string
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Hash a password using bcrypt (if bcrypt is available)
 */
function hashPassword(password) {
  // In a real implementation, you would use bcrypt
  // For now, we'll use a simple hash (NOT recommended for production)
  return crypto.createHash('sha256').update(password).digest('hex')
}

/**
 * Verify a password against its hash
 */
function verifyPassword(password, hash) {
  // In a real implementation, you would use bcrypt.compare
  // For now, we'll use a simple comparison (NOT recommended for production)
  return hashPassword(password) === hash
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate Shopify shop domain format
 */
function isValidShopDomain(domain) {
  const shopDomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/
  return shopDomainRegex.test(domain)
}

module.exports = {
  verifyShopifyWebhook,
  generateSecureToken,
  hashPassword,
  verifyPassword,
  sanitizeInput,
  isValidEmail,
  isValidShopDomain
}
