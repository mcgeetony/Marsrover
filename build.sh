#!/bin/bash

# Mars Rover Mission Control - Production Build Script
echo "🚀 Starting Mars Rover Mission Control build..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing frontend dependencies..."
yarn install --frozen-lockfile

# Build the React application
echo "🔨 Building React application..."
yarn build

# Check if build was successful
if [ -d "build" ]; then
    echo "✅ Frontend build successful!"
    echo "📊 Build statistics:"
    du -sh build/
    echo "📁 Build contents:"
    ls -la build/
else
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "🎉 Mars Rover Mission Control build completed successfully!"
echo "🌐 Ready for deployment to Vercel!"