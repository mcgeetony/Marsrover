#!/bin/bash

echo "🔄 Restoring development environment..."

# Restore original files if backups exist
if [ -f "backend/server-original.py" ]; then
    echo "📦 Restoring original server.py..."
    cp backend/server-original.py backend/server.py
    rm -f backend/server-original.py
else
    echo "⚠️  No backup found for server.py"
fi

if [ -f "backend/requirements-original.txt" ]; then
    echo "📦 Restoring original requirements.txt..."
    cp backend/requirements-original.txt backend/requirements.txt
    rm -f backend/requirements-original.txt
else
    echo "⚠️  No backup found for requirements.txt"
fi

echo "✅ Development environment restored!"
echo "💡 You can now run: npm start"