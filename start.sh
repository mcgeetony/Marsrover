#!/bin/bash

echo "🚀 Starting Mars Rover Mission Control..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.8+ from https://python.org${NC}"
    exit 1
fi

if ! command_exists yarn; then
    echo -e "${YELLOW}⚠️  Yarn not found. Installing yarn...${NC}"
    npm install -g yarn
fi

echo -e "${GREEN}✅ Prerequisites check passed!${NC}"

# Setup backend
echo -e "${BLUE}🐍 Setting up Python backend...${NC}"
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚙️  Creating backend .env file...${NC}"
    cat > .env << EOL
MONGO_URL="mongodb://localhost:27017"
DB_NAME="mars_rover_db"
CORS_ORIGINS="*"
NASA_API_KEY="9JjogYWIPOUHJKl7RMUmM0pUuepH6wiafS8zgs0d"
EOL
    echo -e "${GREEN}✅ Backend .env file created with NASA API key${NC}"
fi

cd ..

# Setup frontend
echo -e "${BLUE}⚛️  Setting up React frontend...${NC}"
cd frontend

# Install frontend dependencies
echo -e "${YELLOW}📦 Installing React dependencies...${NC}"
yarn install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚙️  Creating frontend .env file...${NC}"
    cat > .env << EOL
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
EOL
    echo -e "${GREEN}✅ Frontend .env file created${NC}"
fi

cd ..

echo -e "${GREEN}🎉 Setup complete!${NC}"
echo -e "${BLUE}🚀 Starting both servers...${NC}"

# Start backend in background
echo -e "${YELLOW}🐍 Starting Python backend on http://localhost:8001${NC}"
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo -e "${YELLOW}⚛️  Starting React frontend on http://localhost:3000${NC}"
cd frontend
yarn start &
FRONTEND_PID=$!
cd ..

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}🌟 Mars Rover Mission Control is starting up!${NC}"
echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend API: http://localhost:8001${NC}"
echo -e "${BLUE}📚 API Docs: http://localhost:8001/docs${NC}"
echo -e "${YELLOW}⏹️  Press Ctrl+C to stop both servers${NC}"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID