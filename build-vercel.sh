#!/bin/bash

echo "🚀 Preparing Mars Rover Mission Control for Vercel deployment..."

echo "📊 Backend size optimization:"
echo "Before: $(du -sh backend/ | cut -f1)"

# Create backup of original files
echo "📦 Creating backups..."
cp backend/server.py backend/server-original.py 2>/dev/null || true
cp backend/requirements.txt backend/requirements-original.txt 2>/dev/null || true

# Replace with lightweight versions
echo "📦 Installing lightweight backend..."
cp backend/server-vercel.py backend/server.py
cp backend/requirements-vercel.txt backend/requirements.txt

# Remove heavy unnecessary files and directories
echo "🧹 Cleaning up heavy files..."
rm -rf backend/venv/ 2>/dev/null || true
rm -rf backend/__pycache__/ 2>/dev/null || true
rm -rf backend/.pytest_cache/ 2>/dev/null || true
rm -rf backend/node_modules/ 2>/dev/null || true
rm -f backend/*.log 2>/dev/null || true
rm -f backend/server-vercel.py 2>/dev/null || true

echo "After: $(du -sh backend/ | cut -f1)"
echo "✅ Backend optimized for Vercel deployment!"

# Build frontend
echo "🔨 Building frontend..."
cd frontend
yarn build

if [ -d "build" ]; then
    echo "✅ Frontend build successful!"
    echo "📊 Frontend build size: $(du -sh build/ | cut -f1)"
else
    echo "❌ Frontend build failed!"
    exit 1
fi

cd ..

echo "🎉 Vercel deployment preparation complete!"
echo "📝 Next steps:"
echo "1. Run: vercel --prod"
echo "2. Set NASA_API_KEY environment variable in Vercel dashboard"
echo "3. Your Mars mission control will be live!"