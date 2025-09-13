# Xeno-FDE Backend

Backend service for Shopify integration with comprehensive data synchronization and webhook handling.

## Quick Start

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- PostgreSQL (if running locally)

### 🚀 Deploy to Railway (Recommended)

For production deployment, use Railway:

```bash
# Run the setup script
./setup-railway-deployment.sh

# Or follow the detailed guide
# See GITHUB_RAILWAY_SETUP.md
```

**One-click deployment:**
1. Push to GitHub
2. Railway automatically deploys
3. Your app is live at `https://your-app.railway.app`

### Installation

1. **Clone and install dependencies:**
\`\`\`bash
npm install
\`\`\`

2. **Set up environment variables:**
Create a `.env` file in the root directory:
\`\`\`env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/xeno_fde"
DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/xeno_fde_test"

# Redis
REDIS_URL="redis://localhost:6379"

# Application
NODE_ENV="development"
PORT=3000
LOG_LEVEL="info"

# Shopify Configuration
SHOPIFY_API_KEY="your-shopify-api-key-here"
SHOPIFY_API_SECRET="your-shopify-api-secret-here"
SHOPIFY_ACCESS_TOKEN="your-shopify-access-token-here"
SHOPIFY_SHOP_DOMAIN="your-shop.myshopify.com"
SHOPIFY_WEBHOOK_SECRET="your-webhook-secret-here"

# JWT (generate a secure secret)
JWT_SECRET="your-jwt-secret-here"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
\`\`\`

3. **Start services with Docker:**
\`\`\`bash
docker-compose up -d postgres redis
\`\`\`

4. **Set up database:**
\`\`\`bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed database with test data
node prisma/seed.js
\`\`\`

5. **Start development server:**
\`\`\`bash
npm run dev
\`\`\`

### Alternative: Full Docker Setup

Run everything with Docker:
\`\`\`bash
docker-compose up --build
\`\`\`

## Database Operations

### Essential Prisma Commands
\`\`\`bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply new migration
npx prisma migrate dev --name migration_name

# Seed database with test data
node prisma/seed.js

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio

# Deploy migrations to production
npx prisma migrate deploy
\`\`\`

### Database Schema Overview

The multi-tenant schema includes:
- **Tenant**: Main tenant entity with Shopify credentials
- **Store**: Store-specific configuration per tenant
- **Customer**: Customer data with tenant isolation
- **Product**: Product catalog with SKU and pricing
- **Order**: Order data with customer relationships
- **SyncLog**: Tracks data synchronization status
- **WebhookEvent**: Webhook processing audit trail

All models include proper indices on `(tenantId, shopifyId)` for optimal query performance.

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/me` - Get user profile

### Shopify Integration
- `GET /api/shopify/stores` - List connected stores
- `POST /api/shopify/stores` - Connect new store
- `GET /api/shopify/products/:storeId` - Get store products
- `GET /api/shopify/orders/:storeId` - Get store orders

### Webhooks
- `POST /api/webhooks/shopify/orders` - Shopify order webhooks
- `POST /api/webhooks/shopify/products` - Shopify product webhooks
- `POST /api/webhooks/shopify/customers` - Shopify customer webhooks

### Metrics
- `GET /api/metrics/dashboard` - Dashboard metrics
- `GET /api/metrics/sync-status` - Synchronization status

## Development

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests with Jest

### Development Workflow
1. Make schema changes in `prisma/schema.prisma`
2. Run `npx prisma generate` to update the client
3. Run `npx prisma migrate dev --name descriptive_name` to create migration
4. Test changes with `npm run dev`

## Project Structure

\`\`\`
src/
├── app.js              # Express application setup
├── lib/
│   └── prisma.js       # Prisma client configuration
├── routes/             # API route handlers
│   ├── auth.js
│   ├── shopify.js
│   ├── webhooks.js
│   └── metrics.js
└── services/           # Business logic services
    ├── shopifyService.js
    └── transformer.js

prisma/
├── schema.prisma       # Database schema
└── seed.js            # Database seeding script

docker-compose.yml      # Docker services configuration
Dockerfile             # Backend container configuration
\`\`\`

## Environment Variables

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `DATABASE_URL_TEST` | Test database connection string | `postgresql://user:pass@localhost:5432/db_test` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `SHOPIFY_API_KEY` | Shopify app API key | `your-shopify-api-key-here` |
| `SHOPIFY_API_SECRET` | Shopify app secret | `your-shopify-api-secret-here` |
| `SHOPIFY_ACCESS_TOKEN` | Shopify admin API access token | `your-shopify-access-token-here` |
| `SHOPIFY_SHOP_DOMAIN` | Shopify shop domain | `xeno-fde-test1.myshopify.com` |
| `SHOPIFY_WEBHOOK_SECRET` | Shopify webhook secret | `your-webhook-secret` |
| `JWT_SECRET` | JWT signing secret | `your-jwt-secret` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `3000` |
| `LOG_LEVEL` | Logging level | `info`, `debug`, `warn`, `error` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |

## Multi-Tenant Architecture

This backend is designed for enterprise-scale multi-tenancy:

### Tenant Isolation
- All data models include `tenantId` for complete data isolation
- Database indices optimized for tenant-scoped queries
- API endpoints automatically filter by tenant context

### Scalability Features
- Optimized database indices for high-performance queries
- Webhook event tracking and replay capabilities
- Sync logging for monitoring data consistency
- Redis caching for frequently accessed data

### Security
- JWT-based authentication with tenant context
- Shopify webhook signature verification
- Environment-based configuration management

## Middleware & Security Features

### Authentication & Authorization
- JWT-based authentication with secure token generation
- Password hashing using bcrypt with configurable rounds
- Protected routes with tenant-aware middleware

### Rate Limiting
- Redis-backed rate limiting to prevent abuse
- Configurable request limits per time window
- Different limits for authenticated vs anonymous users

### Input Validation
- Express-validator for request validation
- Sanitization of user inputs
- Comprehensive error handling with proper HTTP status codes

### Webhook Security
- Shopify webhook signature verification
- HMAC validation for incoming webhook payloads
- Replay attack protection

### Logging & Monitoring
- Structured logging with Winston
- Request/response logging with Morgan
- Error tracking and performance monitoring
- Log level configuration for different environments

## Deployment

### Production Setup
1. Set up PostgreSQL and Redis instances
2. Configure environment variables for production
3. Run `npx prisma migrate deploy` to apply migrations
4. Start the application with `npm start`

### Docker Deployment
\`\`\`bash
# Build and run all services
docker-compose up --build -d

# View logs
docker-compose logs -f backend
\`\`\`

## Testing

### Running Tests
\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
\`\`\`

### Test Structure
- Unit tests for services and utilities
- Integration tests for API endpoints
- Database tests with isolated test database
- Webhook verification tests

## Next Steps

1. Implement authentication logic in `src/routes/auth.js`
2. Add Shopify API integration in `src/services/shopifyService.js`
3. Set up webhook verification and processing
4. Implement data transformation logic
5. Add comprehensive error handling and logging
6. Set up monitoring and metrics collection

## Support

For issues related to:
- **Database**: Check connection strings and ensure PostgreSQL is running
- **Shopify Integration**: Verify API credentials and webhook configurations
- **Performance**: Review database indices and query patterns
- **Multi-tenancy**: Ensure proper tenant context in all operations
