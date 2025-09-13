/**
 * Data transformation utilities for converting Shopify API responses to our database schema
 */

/**
 * Transform Shopify order data to our Order model
 */
function transformOrderData(shopifyOrder, tenantId) {
  return {
    shopifyId: String(shopifyOrder.id),
    customerShopifyId: shopifyOrder.customer ? String(shopifyOrder.customer.id) : null,
    orderNumber: shopifyOrder.order_number || null,
    email: shopifyOrder.email || null,
    totalPrice: shopifyOrder.total_price || null,
    subtotalPrice: shopifyOrder.subtotal_price || null,
    taxPrice: shopifyOrder.total_tax || null,
    currency: shopifyOrder.currency || 'USD',
    financialStatus: shopifyOrder.financial_status || null,
    fulfillmentStatus: shopifyOrder.fulfillment_status || null,
    createdAt: shopifyOrder.created_at ? new Date(shopifyOrder.created_at) : new Date(),
    tenantId
  }
}

/**
 * Transform Shopify product data to our Product model
 */
function transformProductData(shopifyProduct, tenantId) {
  return {
    shopifyId: String(shopifyProduct.id),
    title: shopifyProduct.title || null,
    handle: shopifyProduct.handle || null,
    vendor: shopifyProduct.vendor || null,
    productType: shopifyProduct.product_type || null,
    status: shopifyProduct.status || 'active',
    createdAt: shopifyProduct.created_at ? new Date(shopifyProduct.created_at) : new Date(),
    updatedAt: shopifyProduct.updated_at ? new Date(shopifyProduct.updated_at) : new Date(),
    tenantId
  }
}

/**
 * Transform Shopify customer data to our Customer model
 */
function transformCustomerData(shopifyCustomer, tenantId) {
  return {
    shopifyId: String(shopifyCustomer.id),
    email: shopifyCustomer.email || null,
    firstName: shopifyCustomer.first_name || null,
    lastName: shopifyCustomer.last_name || null,
    phone: shopifyCustomer.phone || null,
    createdAt: shopifyCustomer.created_at ? new Date(shopifyCustomer.created_at) : new Date(),
    updatedAt: shopifyCustomer.updated_at ? new Date(shopifyCustomer.updated_at) : new Date(),
    tenantId
  }
}

module.exports = {
  transformOrderData,
  transformProductData,
  transformCustomerData
}
