# Shopify OAuth Setup Guide

This guide explains how to set up and use the Shopify OAuth flow for multi-tenant app installation.

## Prerequisites

Make sure you have these environment variables configured in your `.env` file:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:3001/xeno_dev
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:3002/xeno_test
REDIS_URL=redis://localhost:3003
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Shopify OAuth
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
BACKEND_BASE_URL=https://your-ngrok-or-prod-url
FRONTEND_BASE_URL=http://localhost:3000
SHOPIFY_API_VERSION=2025-01
SHOPIFY_SCOPES=read_products,read_orders,read_customers,write_webhooks

# Webhook Security
SHOPIFY_WEBHOOK_SECRET=your_webhook_signing_secret
JWT_SECRET=your_jwt_secret
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## OAuth Flow

### 1. Install Route

**Endpoint:** `GET /api/shopify/install?shop=SHOP_DOMAIN`

**Example:**
```
https://your-backend.com/api/shopify/install?shop=my-dev-store.myshopify.com
```

**What it does:**
- Validates the shop domain format
- Generates a CSRF protection state token
- Redirects to Shopify's OAuth authorization page
- Stores the state token in a secure cookie

### 2. Callback Route

**Endpoint:** `GET /api/shopify/callback`

**What it does:**
- Validates the state token to prevent CSRF attacks
- Exchanges the authorization code for an access token
- Creates or updates the tenant in the database
- Registers webhooks for the shop
- Redirects to the frontend success page

## Database Changes

The `Tenant` model has been updated with:
- `accessToken` is now optional (nullable)
- `active` field added (defaults to true)

## Webhook Handling

### App Uninstalled

When a merchant uninstalls the app:
1. The `app/uninstalled` webhook is received
2. The tenant is marked as inactive (`active = false`)
3. The access token is removed (`accessToken = null`)
4. Any scheduled jobs should be cleaned up (TODO in code)

### Supported Webhook Topics

- `orders/create`
- `orders/updated`
- `orders/paid`
- `orders/cancelled`
- `orders/fulfilled`
- `products/create`
- `products/update`
- `customers/create`
- `customers/update`
- `app/uninstalled`

## Testing

1. **Start your server:**
   ```bash
   npm start
   ```

2. **Test the OAuth flow:**
   ```bash
   node test-oauth.js
   ```

3. **Manual testing:**
   - Visit: `http://localhost:3000/api/shopify/install?shop=your-dev-shop.myshopify.com`
   - Complete the OAuth flow in your browser
   - Check your database to see the tenant record

## Security Features

- **CSRF Protection:** State tokens prevent cross-site request forgery
- **Webhook Verification:** HMAC signatures verify webhook authenticity
- **Tenant Isolation:** Each shop gets its own tenant with isolated data
- **Access Token Management:** Tokens are securely stored and removed on uninstall

## Error Handling

- Invalid shop domains are rejected
- Missing or invalid state tokens cause OAuth failures
- Webhook registration failures don't break the OAuth flow
- Inactive tenants can't process webhooks (except app/uninstalled)

## Next Steps

1. Set up your Shopify app in the Partner Dashboard
2. Configure your webhook endpoints
3. Test with a development store
4. Deploy to production with proper environment variables
