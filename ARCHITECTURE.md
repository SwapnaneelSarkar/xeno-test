# System Architecture

## High-Level Architecture

```mermaid
graph TB
    subgraph "External Systems"
        S[Shopify Stores]
        F[Frontend Dashboard]
    end
    
    subgraph "Xeno Backend Service"
        API[Express.js API]
        AUTH[JWT Authentication]
        WEBHOOK[Webhook Handler]
        METRICS[Metrics Service]
        MONITOR[Monitoring Service]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL Database)]
        REDIS[(Redis Cache)]
    end
    
    subgraph "Infrastructure"
        RAILWAY[Railway Platform]
        DOCKER[Docker Containers]
    end
    
    S -->|OAuth| API
    S -->|Webhooks| WEBHOOK
    F -->|API Calls| API
    API --> AUTH
    API --> METRICS
    WEBHOOK --> DB
    API --> DB
    METRICS --> DB
    API --> REDIS
    MONITOR --> DB
    API --> RAILWAY
    RAILWAY --> DOCKER
```

## Multi-Tenant Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as Backend API
    participant S as Shopify
    participant DB as Database
    
    U->>F: Register/Login
    F->>API: POST /api/auth/register
    API->>DB: Create Tenant
    API->>S: Register Webhooks
    S-->>API: Webhook Events
    API->>DB: Store Data (tenant-isolated)
    F->>API: GET /api/metrics/dashboard
    API->>DB: Query Tenant Data
    API-->>F: Return Metrics
```

## Database Schema

```mermaid
erDiagram
    Tenant ||--o{ Store : has
    Tenant ||--o{ Customer : owns
    Tenant ||--o{ Product : owns
    Tenant ||--o{ Order : owns
    Tenant ||--o{ WebhookEvent : processes
    Customer ||--o{ Order : places
    
    Tenant {
        string id PK
        string name
        string email UK
        string shopDomain UK
        string accessToken
        boolean active
        datetime createdAt
    }
    
    Store {
        string id PK
        string shopDomain
        string accessToken
        string tenantId FK
        datetime createdAt
    }
    
    Customer {
        string id PK
        string shopifyId
        string email
        string firstName
        string lastName
        string phone
        string tenantId FK
        datetime createdAt
    }
    
    Product {
        string id PK
        string shopifyId
        string title
        decimal price
        string sku
        string tenantId FK
        datetime createdAt
    }
    
    Order {
        string id PK
        string shopifyId
        decimal totalPrice
        string currency
        string tenantId FK
        string customerId FK
        datetime createdAt
    }
    
    WebhookEvent {
        string id PK
        string topic
        json payload
        boolean processed
        string tenantId FK
        datetime createdAt
    }
```

## API Architecture

```mermaid
graph LR
    subgraph "API Layer"
        ROUTES[Express Routes]
        MIDDLEWARE[Middleware Stack]
        VALIDATION[Input Validation]
        AUTH[Authentication]
        RATE[Rate Limiting]
    end
    
    subgraph "Service Layer"
        SHOPIFY[Shopify Service]
        WEBHOOK[Webhook Service]
        METRICS[Metrics Service]
        MONITOR[Monitoring Service]
    end
    
    subgraph "Data Layer"
        PRISMA[Prisma ORM]
        DB[(PostgreSQL)]
        CACHE[(Redis)]
    end
    
    ROUTES --> MIDDLEWARE
    MIDDLEWARE --> VALIDATION
    VALIDATION --> AUTH
    AUTH --> RATE
    RATE --> SHOPIFY
    RATE --> WEBHOOK
    RATE --> METRICS
    SHOPIFY --> PRISMA
    WEBHOOK --> PRISMA
    METRICS --> PRISMA
    PRISMA --> DB
    RATE --> CACHE
    MONITOR --> DB
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV[Local Development]
        TEST[Test Environment]
    end
    
    subgraph "Production"
        GITHUB[GitHub Repository]
        RAILWAY[Railway Platform]
        DOCKER[Docker Containers]
        DB_PROD[PostgreSQL Database]
        REDIS_PROD[Redis Cache]
    end
    
    subgraph "CI/CD Pipeline"
        ACTIONS[GitHub Actions]
        TESTS[Automated Tests]
        DEPLOY[Auto Deployment]
    end
    
    DEV --> GITHUB
    TEST --> GITHUB
    GITHUB --> ACTIONS
    ACTIONS --> TESTS
    TESTS --> DEPLOY
    DEPLOY --> RAILWAY
    RAILWAY --> DOCKER
    DOCKER --> DB_PROD
    DOCKER --> REDIS_PROD
```

## Security Architecture

```mermaid
graph TB
    subgraph "External Requests"
        CLIENT[Client Applications]
        SHOPIFY[Shopify Webhooks]
    end
    
    subgraph "Security Layer"
        CORS[CORS Protection]
        HELMET[Security Headers]
        RATE[Rate Limiting]
        AUTH[JWT Authentication]
        HMAC[HMAC Verification]
    end
    
    subgraph "Application Layer"
        API[API Endpoints]
        VALIDATION[Input Validation]
        SANITIZATION[Data Sanitization]
    end
    
    subgraph "Data Layer"
        ORM[Prisma ORM]
        DB[(Database)]
    end
    
    CLIENT --> CORS
    SHOPIFY --> HMAC
    CORS --> HELMET
    HMAC --> RATE
    HELMET --> AUTH
    RATE --> API
    AUTH --> VALIDATION
    API --> SANITIZATION
    VALIDATION --> ORM
    SANITIZATION --> ORM
    ORM --> DB
```

## Monitoring & Observability

```mermaid
graph LR
    subgraph "Application"
        APP[Express App]
        LOGS[Winston Logging]
        METRICS[Custom Metrics]
    end
    
    subgraph "Monitoring"
        HEALTH[Health Checks]
        CIRCUIT[Circuit Breaker]
        ALERTS[Alert System]
    end
    
    subgraph "External"
        RAILWAY[Railway Monitoring]
        SENTRY[Sentry Error Tracking]
    end
    
    APP --> LOGS
    APP --> METRICS
    APP --> HEALTH
    APP --> CIRCUIT
    HEALTH --> ALERTS
    CIRCUIT --> ALERTS
    LOGS --> SENTRY
    METRICS --> RAILWAY
    ALERTS --> RAILWAY
```

## Assumptions & Design Decisions

### Multi-Tenancy Approach
- **Tenant Isolation**: Database-level isolation using tenantId foreign keys
- **Data Segregation**: All queries include tenantId filter
- **Security**: JWT tokens include tenantId for authorization

### Webhook Processing
- **Idempotency**: Webhook events are deduplicated using (tenantId, topic, shopifyId)
- **Retry Logic**: Failed webhooks are retried with exponential backoff
- **Circuit Breaker**: Prevents cascade failures during high error rates

### Database Design
- **Normalization**: Proper 3NF schema with foreign key relationships
- **Indexing**: Composite indexes on (tenantId, shopifyId) for performance
- **Migrations**: Prisma migrations for schema versioning

### API Design
- **RESTful**: Standard HTTP methods and status codes
- **Pagination**: Cursor-based pagination for large datasets
- **Rate Limiting**: Tenant-specific rate limits using Redis

### Deployment Strategy
- **Containerization**: Docker for consistent deployments
- **Platform**: Railway for managed infrastructure
- **CI/CD**: GitHub Actions for automated testing and deployment

## Next Steps for Production

1. **Frontend Dashboard**: React.js UI for data visualization
2. **Advanced Monitoring**: APM integration (DataDog, New Relic)
3. **Caching Strategy**: Redis caching for frequently accessed data
4. **Load Balancing**: Multiple instances behind load balancer
5. **Backup Strategy**: Automated database backups
6. **Security Audit**: Penetration testing and security review
7. **Performance Testing**: Load testing with realistic traffic
8. **Documentation**: API documentation with Swagger/OpenAPI
