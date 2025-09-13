#!/bin/bash

# Test deployment script that mimics CI/CD environment
# This script tests the application startup and health check

set -e

echo "🚀 Testing xeno-fde-backend deployment"
echo "======================================"

# Set test environment variables
export NODE_ENV=test
export DATABASE_URL="postgresql://test:test@localhost:5432/xeno_test"
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=test-secret-key
export WEBHOOK_SECRET=test-webhook-secret

echo "📋 Environment variables set:"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: $DATABASE_URL"
echo "REDIS_HOST: $REDIS_HOST"
echo "REDIS_PORT: $REDIS_PORT"

# Start the application in background
echo "🔄 Starting application..."
npm start &
APP_PID=$!

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Run health check
echo "🏥 Running health check..."
bash scripts/health-check.sh

# Clean up
echo "🧹 Cleaning up..."
kill $APP_PID 2>/dev/null || true

echo "✅ Deployment test completed successfully!"
