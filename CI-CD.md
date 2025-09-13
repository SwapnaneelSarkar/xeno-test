# CI/CD Pipeline Documentation

This document describes the comprehensive CI/CD pipeline setup for the Xeno FDE Backend service.

## Overview

The CI/CD pipeline includes:
- **Automated Testing** (Unit, Integration, Database)
- **Security Scanning** (Dependency audit, Snyk, CodeQL)
- **Performance Testing** (Load testing, Lighthouse)
- **Docker Build & Test**
- **Multi-environment Deployment** (Staging, Production)
- **Dependency Management** (Dependabot)

## Pipeline Workflows

### 1. Main CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main`, `develop`, or `feature/*` branches
- Pull requests to `main` or `develop`

**Jobs:**
1. **Lint & Format** - Code quality checks
2. **Security Audit** - Dependency and vulnerability scanning
3. **Test Suite** - Unit, integration, and database tests
4. **Docker Build & Test** - Container image building and testing
5. **Deploy to Staging** - Automatic deployment on `develop` branch
6. **Deploy to Production** - Automatic deployment on `main` branch
7. **Notify on Failure** - Team notifications for failed builds

### 2. Security Scanning (`.github/workflows/security.yml`)

**Triggers:**
- Weekly schedule (Mondays at 2 AM)
- Push to `main` or `develop`
- Pull requests

**Features:**
- npm audit for dependency vulnerabilities
- Snyk security scanning
- CodeQL analysis for code security
- Container vulnerability scanning with Trivy

### 3. Performance Testing (`.github/workflows/performance.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests
- Weekly schedule (Sundays at 3 AM)

**Features:**
- Load testing with Artillery
- Lighthouse performance audits
- Memory leak detection
- Response time monitoring

### 4. Dependabot Auto-merge (`.github/workflows/dependabot.yml`)

**Features:**
- Automatic testing of dependency updates
- Auto-merge for minor/patch updates
- Manual review for major updates

## Environment Setup

### Required Secrets

Add these secrets to your GitHub repository:

```bash
# Security scanning
SNYK_TOKEN=your_snyk_token

# Deployment (if using external services)
KUBECONFIG=your_kubeconfig
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password

# Application secrets (for production)
DATABASE_URL=your_production_database_url
JWT_SECRET=your_jwt_secret
WEBHOOK_SECRET=your_webhook_secret
SENTRY_DSN=your_sentry_dsn
```

### Environment Variables

The pipeline uses these environment variables:

```bash
NODE_VERSION=18
POSTGRES_DB=xeno_test
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Local Development

### Using Docker Compose

1. **Development environment:**
   ```bash
   docker-compose up -d
   ```

2. **Testing environment:**
   ```bash
   docker-compose -f docker-compose.test.yml up --abort-on-container-exit
   ```

### Running Tests Locally

```bash
# Install dependencies
npm ci

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:database
```

## Deployment Options

### 1. Docker Compose (Recommended for small deployments)

```bash
# Production deployment
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### 2. Kubernetes (Recommended for production)

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n xeno-fde-backend

# View logs
kubectl logs -f deployment/xeno-fde-backend -n xeno-fde-backend
```

### 3. Helm (Recommended for complex deployments)

```bash
# Install/upgrade with Helm
helm upgrade --install xeno-fde-backend ./helm-chart \
  --namespace xeno-fde-backend \
  --create-namespace \
  --set secrets.DATABASE_URL="your-database-url" \
  --set secrets.JWT_SECRET="your-jwt-secret" \
  --set secrets.WEBHOOK_SECRET="your-webhook-secret"

# Check status
helm status xeno-fde-backend -n xeno-fde-backend
```

## Monitoring and Observability

### Health Checks

- **Liveness:** `GET /health` - Basic health check
- **Readiness:** `GET /ready` - Service readiness check
- **Metrics:** `GET /api/metrics/metrics` - Prometheus metrics

### Logging

- **Structured JSON logs** with Winston
- **Request logging** with sanitized data
- **Performance metrics** logging
- **Error tracking** with Sentry (optional)

### Metrics

The service exposes Prometheus-compatible metrics:
- System metrics (memory, CPU, uptime)
- Database operation counts
- Webhook processing metrics
- API call metrics

## Security Features

### Rate Limiting
- **General API:** 100 requests per 15 minutes
- **Webhooks:** 50 requests per 15 minutes
- **Auth endpoints:** 10 requests per 15 minutes

### Security Headers
- Helmet.js for security headers
- CORS with strict origin validation
- HTTPS redirection in production
- Input validation with express-validator

### Vulnerability Scanning
- Automated dependency scanning
- Container image scanning
- Code security analysis
- Regular security updates

## Troubleshooting

### Common Issues

1. **Tests failing in CI:**
   - Check database connection
   - Verify environment variables
   - Check Redis connectivity

2. **Docker build failures:**
   - Check Dockerfile syntax
   - Verify base image availability
   - Check build context

3. **Deployment failures:**
   - Check Kubernetes cluster connectivity
   - Verify secrets and configmaps
   - Check resource limits

### Debug Commands

```bash
# Check CI logs
gh run list
gh run view <run-id>

# Test locally with same environment as CI
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Check Kubernetes resources
kubectl describe pod <pod-name> -n xeno-fde-backend
kubectl logs <pod-name> -n xeno-fde-backend

# Check Helm deployment
helm get values xeno-fde-backend -n xeno-fde-backend
```

## Best Practices

1. **Always test locally** before pushing
2. **Use feature branches** for new features
3. **Keep dependencies updated** with Dependabot
4. **Monitor security alerts** and address promptly
5. **Review deployment logs** after each deployment
6. **Use semantic versioning** for releases
7. **Document breaking changes** in PR descriptions

## Support

For issues with the CI/CD pipeline:
1. Check the GitHub Actions logs
2. Review this documentation
3. Check the troubleshooting section
4. Create an issue in the repository
