#!/bin/bash

# Test setup script for xeno-fde-backend
# This script sets up the test database and runs tests

set -e

echo "🧪 Setting up test environment"
echo "=============================="

# Set test environment variables
export NODE_ENV=test
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/xeno_test"
export DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/xeno_test"
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=test-secret-key
export WEBHOOK_SECRET=test-webhook-secret

echo "📋 Environment variables set:"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: $DATABASE_URL"

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL connection..."
if ! pg_isready -h localhost -p 5432 -U postgres; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    echo "   On macOS with Homebrew: brew services start postgresql"
    echo "   On Ubuntu: sudo systemctl start postgresql"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Create test database if it doesn't exist
echo "🗄️ Setting up test database..."
createdb -h localhost -U postgres xeno_test 2>/dev/null || echo "Test database already exists"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run tests
echo "🧪 Running tests..."
npm test

echo "✅ Test setup completed successfully!"
