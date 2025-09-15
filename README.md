# Xeno FDE Backend — Shopify Data Ingestion & Insights

Human-friendly backend for connecting Shopify stores, ingesting data in real-time, and serving insights securely across multiple tenants.

[![Deployed on Railway](https://img.shields.io/badge/Deployed%20on-Railway-0B0D0E?style=for-the-badge&logo=railway)](https://superb-success-production-7bf1.up.railway.app)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.6+-2D3748?style=for-the-badge&logo=prisma)](https://prisma.io/)

## 🚀 Live

- Production: https://superb-success-production-7bf1.up.railway.app
- Health: https://superb-success-production-7bf1.up.railway.app/health

## 🧰 Setup (5–10 minutes)

1) Clone and install
```bash
git clone <repository-url>
cd xeno-fde-backend
npm install
```

2) Configure environment
```bash
cp env.example .env
# Fill the following (minimum)
# DATABASE_URL=...
# JWT_SECRET=...
# BACKEND_BASE_URL=http://localhost:3000
# SHOPIFY_API_KEY=...
# SHOPIFY_API_SECRET=...
```

3) Prepare database
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed   # optional
```

4) Run locally
```bash
npm run dev
# App starts on PORT from env (defaults via config)
```

Optional: Docker
```bash
docker-compose up -d
# or
docker build -t xeno-fde-backend . && docker run -p 3000:3000 xeno-fde-backend
```

## 🏗️ Architecture (at a glance)

```mermaid
graph TB
    subgraph "External"
        S[Shopify Stores]
        F[Frontend (future)]
    end

    subgraph "Backend"
        API[Express API]
        AUTH[JWT Auth]
        WH[Webhook Handler]
        METRICS[Metrics]
    end

    subgraph "Data"
        DB[(PostgreSQL)]
        REDIS[(Redis)]
    end

    S -->|OAuth/Webhooks| API
    S --> WH
    F -->|REST| API
    API --> AUTH
    API --> DB
    WH --> DB
    API --> REDIS
    API --> METRICS
```

### Multi-tenant flow
- Onboard via Shopify OAuth → register webhooks → store per-tenant data → query via JWT-authenticated APIs.

## 📚 API Endpoints

Base URL: `/`

- Authentication
  - POST `/api/auth/register` — create tenant + issue JWT
  - POST `/api/auth/login` — login by email, receive JWT
  - POST `/api/auth/logout`
  - GET `/api/auth/me`

- Shopify OAuth
  - GET `/api/shopify/install?shop=<shop.myshopify.com>`
  - GET `/api/shopify/callback` (Shopify redirects here)

- Tenant data (JWT required)
  - GET `/api/shopify/orders?Page&limit&from&to&status`
  - GET `/api/shopify/products?Page&limit&search&vendor&productType&status`
  - GET `/api/shopify/customers?Page&limit&search&email`
  - GET `/api/shopify/stores`

- Webhooks (Shopify → backend)
  - POST `/api/webhooks` — generic handler (HMAC verified)
  - POST `/api/webhooks/shopify` — backward-compatible entry
  - POST `/api/webhooks/shopify/orders|products|customers`
  - GET `/api/webhooks/shopify/status` — recent 24h stats

- Webhook management utilities
  - POST `/api/webhook-management/register/:tenantId`
  - GET `/api/webhook-management/list/:tenantId`
  - DELETE `/api/webhook-management/delete-all/:tenantId`
  - GET `/api/webhook-management/events/:tenantId?topic&processed&page&limit`
  - POST `/api/webhook-management/retry/:eventId`
  - POST `/api/webhook-management/retry-failed/:tenantId` (body: `{ limit }`)
  - GET `/api/webhook-management/stats/:tenantId?days=7`

- Metrics & health
  - GET `/api/metrics/dashboard` — tenant dashboard (JWT)
  - GET `/api/metrics/metrics` — Prometheus format
  - GET `/health`

Tip: Include `Authorization: Bearer <token>` for authenticated endpoints.

## 🗄️ Database schema (Prisma)

Key models and relationships:

- Tenant: `id`, `name`, `email`, `password`, `shopDomain` (unique), `active`, sync timestamps
- Store: `tenantId` → Tenant, `shopDomain` (unique per tenant), `accessToken`
- Customer: `tenantId` → Tenant, `shopifyId` (unique per tenant), `email`, `firstName`, `lastName`
- Product: `tenantId` → Tenant, `shopifyId` (unique per tenant), `title`, `sku`, `price`, `status`
- Order: `tenantId` → Tenant, `shopifyId` (unique per tenant), `customerId?` → Customer, prices/status
- WebhookEvent: `tenantId?`, `topic`, `shopifyId`, `payload`, `processed`, `errorMessage?`
- SyncLog: per-entity sync diagnostics

```mermaid
erDiagram
  Tenant ||--o{ Store : has
  Tenant ||--o{ Customer : owns
  Tenant ||--o{ Product : owns
  Tenant ||--o{ Order : owns
  Tenant ||--o{ WebhookEvent : processes
  Customer ||--o{ Order : places
```

## 🔧 Configuration (env)

```bash
# Core
DATABASE_URL="postgresql://user:password@host:5432/db"
JWT_SECRET="change-me"
PORT=3000

# Shopify app
BACKEND_BASE_URL="http://localhost:3000"
SHOPIFY_API_KEY="..."
SHOPIFY_API_SECRET="..."
SHOPIFY_SCOPES="read_products,read_orders,read_customers,write_webhooks"

# Optional
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
```

## ⚖️ Known limitations & assumptions

- Authentication: the login route currently does not verify the bcrypt password in code (verification is scaffolded and easy to enable). For demos only.
- Metrics endpoint (`/api/metrics/metrics`) returns illustrative counters alongside real process metrics.
- Frontend dashboard is not part of this repo yet; OAuth redirects to `FRONTEND_BASE_URL` if provided.
- Rate limiting works without Redis, but per-tenant distributed limits need Redis.
- Webhook idempotency uses `(tenantId, topic, shopifyId)`; ensure Shopify payloads include `id`.
- Multi-tenancy relies on `tenantId` propagation in JWT and webhook middleware.

## 🧪 Testing

```bash
npm test                # all tests
npm run test:unit
npm run test:integration
npm run test:database
```

## 🤝 Contributing

- Fork, branch, PR. Keep changes small and readable. Add/adjust tests where meaningful.

## 📄 License

ISC — see `LICENSE`.

— Built with care to be easy to run, easy to read, and easy to extend.