#!/bin/bash

# GitHub to Railway Deployment Setup Script
# This script helps you set up automatic deployment from GitHub to Railway

echo "🚀 GitHub to Railway Deployment Setup"
echo "====================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

echo "✅ Railway CLI installed"

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway:"
    railway login
fi

echo "✅ Logged in to Railway"

# Check if git repository exists
if [ ! -d ".git" ]; then
    echo "❌ This is not a git repository. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin <your-github-repo-url>"
    exit 1
fi

echo "✅ Git repository found"

# Check if GitHub remote exists
if ! git remote get-url origin &> /dev/null; then
    echo "❌ No GitHub remote found. Please add your GitHub repository:"
    echo "   git remote add origin <your-github-repo-url>"
    exit 1
fi

echo "✅ GitHub remote configured"

# Initialize Railway project
echo "🚀 Setting up Railway project..."
railway init

echo ""
echo "📋 Next steps:"
echo "1. Add a PostgreSQL database service in Railway dashboard"
echo "2. Add a Redis service (optional) in Railway dashboard"
echo "3. Set up environment variables in Railway dashboard:"
echo "   - NODE_ENV=production"
echo "   - SHOPIFY_CLIENT_ID=your_client_id"
echo "   - SHOPIFY_CLIENT_SECRET=your_client_secret"
echo "   - SHOPIFY_WEBHOOK_SECRET=your_webhook_secret"
echo "   - JWT_SECRET=your_jwt_secret"
echo "   - CORS_ORIGIN=your_frontend_domain"
echo "4. Get Railway token and add it to GitHub Secrets as RAILWAY_TOKEN"
echo "5. Push to GitHub: git push origin main"
echo ""
echo "📚 For detailed instructions, see GITHUB_RAILWAY_SETUP.md"

# Optional: Open Railway dashboard
read -p "Do you want to open Railway dashboard now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    railway open
fi
