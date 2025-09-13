# Shopify Webhook System

This document describes the comprehensive Shopify webhook system implemented in the Xeno FDE Backend.

## Overview

The webhook system handles real-time data synchronization between Shopify stores and the backend database. It supports orders, products, and customers with full verification, logging, and retry mechanisms.

## Features

- ✅ **Webhook Verification**: HMAC-SHA256 signature verification
- ✅ **Multi-tenant Support**: Automatic tenant detection from shop domain
- ✅ **Event Logging**: Complete webhook event tracking in database
- ✅ **Retry Mechanism**: Failed webhook retry functionality
- ✅ **Management API**: Webhook registration and management endpoints
- ✅ **Error Handling**: Comprehensive error logging and handling

## Webhook Endpoints

### Main Webhook Handler
```
POST /api/webhooks/shopify
```
Handles all Shopify webhooks with automatic topic detection.

### Specific Webhook Handlers
```
POST /api/webhooks/shopify/orders
POST /api/webhooks/shopify/products
POST /api/webhooks/shopify/customers
```

### Webhook Status
```
GET /api/webhooks/shopify/status
```
Returns webhook statistics for the last 24 hours.

## Management Endpoints

### Register Webhooks
```
POST /api/webhook-management/register/:tenantId
```
Registers all webhooks for a specific tenant.

### List Webhooks
```
GET /api/webhook-management/list/:tenantId
```
Lists all webhooks registered for a tenant.

### Delete All Webhooks
```
DELETE /api/webhook-management/delete-all/:tenantId
```
Deletes all webhooks for a tenant.

### Get Webhook Events
```
GET /api/webhook-management/events/:tenantId
```
Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `topic`: Filter by webhook topic
- `processed`: Filter by processed status (true/false)

### Retry Failed Webhook
```
POST /api/webhook-management/retry/:eventId
```
Retries a failed webhook event.

## Supported Webhook Topics

### Orders
- `orders/create` - New order created
- `orders/updated` - Order updated
- `orders/paid` - Order payment completed
- `orders/cancelled` - Order cancelled
- `orders/fulfilled` - Order fulfilled

### Products
- `products/create` - New product created
- `products/update` - Product updated

### Customers
- `customers/create` - New customer created
- `customers/update` - Customer updated

## Webhook Verification

All webhooks are verified using HMAC-SHA256 signatures. The system expects:

### Required Headers
- `X-Shopify-Hmac-Sha256`: HMAC signature
- `X-Shopify-Shop-Domain`: Shop domain (e.g., `mystore.myshopify.com`)
- `X-Shopify-Topic`: Webhook topic (e.g., `orders/create`)

### Environment Variables
```env
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret-here
WEBHOOK_BASE_URL=https://your-domain.com
```

## Database Schema

### WebhookEvent Model
```prisma
model WebhookEvent {
  id          String   @id @default(cuid())
  tenantId    String?
  shopifyId   String   @unique
  topic       String
  payload     Json
  processed   Boolean  @default(false)
  processedAt DateTime?
  errorMessage String?
  createdAt   DateTime @default(now())
}
```

## Usage Examples

### 1. Register Webhooks for a Tenant
```bash
curl -X POST http://localhost:3000/api/webhook-management/register/tenant-id
```

### 2. Check Webhook Status
```bash
curl http://localhost:3000/api/webhooks/shopify/status
```

### 3. Get Webhook Events
```bash
curl "http://localhost:3000/api/webhook-management/events/tenant-id?page=1&limit=10"
```

### 4. Retry Failed Webhook
```bash
curl -X POST http://localhost:3000/api/webhook-management/retry/event-id
```

## Testing Webhooks

### Using ngrok for Local Testing
1. Install ngrok: `npm install -g ngrok`
2. Start ngrok: `ngrok http 3000`
3. Update `WEBHOOK_BASE_URL` in `.env` with ngrok URL
4. Register webhooks using the management API

### Test Webhook Payload
```json
{
  "id": 123456789,
  "order_number": "#1001",
  "email": "customer@example.com",
  "total_price": "29.99",
  "currency": "USD",
  "financial_status": "paid",
  "fulfillment_status": "fulfilled",
  "customer": {
    "id": 987654321,
    "email": "customer@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

## Error Handling

The system provides comprehensive error handling:

1. **Verification Errors**: Invalid HMAC signatures return 401
2. **Tenant Errors**: Unknown shop domains return 404
3. **Processing Errors**: Database errors are logged and return 500
4. **Retry Logic**: Failed webhooks can be retried via management API

## Monitoring

### Webhook Status Dashboard
Access `/api/webhooks/shopify/status` for real-time webhook statistics.

### Event Logging
All webhook events are logged in the `WebhookEvent` table with:
- Processing status
- Error messages
- Timestamps
- Full payload data

## Security Considerations

1. **HMAC Verification**: All webhooks must have valid signatures
2. **Tenant Isolation**: Webhooks are processed per tenant
3. **Rate Limiting**: Webhook endpoints respect rate limits
4. **Error Logging**: Sensitive data is not logged in error messages

## Troubleshooting

### Common Issues

1. **Webhook Not Received**
   - Check `WEBHOOK_BASE_URL` configuration
   - Verify webhook registration in Shopify admin
   - Check server logs for errors

2. **Verification Failed**
   - Verify `SHOPIFY_WEBHOOK_SECRET` matches Shopify configuration
   - Check webhook payload format

3. **Tenant Not Found**
   - Ensure tenant exists in database
   - Verify shop domain matches exactly

4. **Processing Errors**
   - Check database connection
   - Review error logs for specific issues
   - Use retry mechanism for failed webhooks

## Development

### Adding New Webhook Topics
1. Add topic to `webhookRegistration.js`
2. Add handler in `webhookService.js`
3. Update documentation

### Custom Webhook Processing
Extend `WebhookService` class with new processing methods and register them in the `processWebhook` method.
