#!/bin/bash

echo "========================================"
echo "  VideoVault App Starting..."
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Please install Node.js 18+"
    echo "Download: https://nodejs.org/"
    exit 1
fi

# Check dist folder
if [ ! -f "./dist/index.html" ]; then
    echo "[ERROR] dist/index.html not found"
    echo "Please run 'npm run build' first"
    exit 1
fi

# Check node_modules
if [ ! -d "./node_modules" ]; then
    echo "Installing dependencies..."
    npm install --production
    echo ""
fi

echo "Starting server..."
echo "Access URL: http://localhost:3001"
echo "Press Ctrl+C to stop the server"
echo ""

npx tsx server/index.ts
