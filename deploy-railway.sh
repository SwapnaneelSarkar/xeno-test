#!/bin/bash

# Railway Deployment Script for xeno-fde-backend
# This script helps you deploy your application to Railway

echo "🚀 Railway Deployment Script for xeno-fde-backend"
echo "================================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway first:"
    railway login
fi

echo "📋 Pre-deployment checklist:"
echo "1. ✅ Railway CLI installed"
echo "2. ✅ Configuration files created"
echo "3. ✅ Package.json updated with Railway scripts"

echo ""
echo "🔧 Next steps:"
echo "1. Run 'railway init' to create a new Railway project"
echo "2. Add a PostgreSQL database service in Railway dashboard"
echo "3. Set up your environment variables in Railway dashboard"
echo "4. Run 'railway up' to deploy"

echo ""
echo "📚 For detailed instructions, see RAILWAY_DEPLOYMENT.md"

# Optional: Initialize Railway project if not already done
read -p "Do you want to initialize a new Railway project now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Initializing Railway project..."
    railway init
    echo "✅ Railway project initialized!"
    echo "Next: Add a PostgreSQL database service and set environment variables in the Railway dashboard"
fi
