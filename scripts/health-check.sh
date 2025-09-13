#!/bin/bash

# Health check script for xeno-fde-backend
# This script checks if the application is running and healthy

set -e

# Function to find the port the Node.js app is running on
find_app_port() {
    # First try to get port from environment variable
    if [ -n "$PORT" ]; then
        echo "$PORT"
        return
    fi
    
    # Try common ports
    for port in 3000 8080 5000 4000; do
        if lsof -i :$port >/dev/null 2>&1; then
            echo "$port"
            return
        fi
    done
    
    # Default fallback
    echo "8080"
}

# Get the port the application is running on
APP_PORT=$(find_app_port)
HEALTH_URL="http://localhost:${APP_PORT}/health"

echo "🔍 Checking health at ${HEALTH_URL}"

# Wait for the application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Check if the application is responding
echo "🏥 Running health check..."
if curl -f "${HEALTH_URL}"; then
    echo "✅ Health check passed!"
    exit 0
else
    echo "❌ Health check failed!"
    echo "Application may not be running on port ${APP_PORT}"
    echo "Checking if any process is listening on port ${APP_PORT}..."
    lsof -i :${APP_PORT} || echo "No process found on port ${APP_PORT}"
    echo "Available ports with Node.js processes:"
    lsof -i -P | grep LISTEN | grep node || echo "No Node.js processes found"
    exit 1
fi
