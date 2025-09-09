# 🚀 Mars Rover Mission Control - Quick Start

## ⚡ Super Simple Setup (1 Command!)

### Prerequisites
- **Node.js 16+** ([Download here](https://nodejs.org))
- **Python 3.8+** ([Download here](https://python.org))

### One-Command Startup

```bash
# Clone and run
git clone <your-repo>
cd mars-rover-mission-control
chmod +x start.sh
./start.sh
```

**That's it!** 🎉 The script automatically:
- ✅ Installs all dependencies
- ✅ Creates environment files with NASA API key
- ✅ Starts both backend and frontend servers
- ✅ Opens your browser to http://localhost:3000

---

## 🔧 Manual Setup (If you prefer step-by-step)

### 1. Install Dependencies
```bash
# Frontend
cd frontend
yarn install

# Backend  
cd ../backend
pip install -r requirements.txt
```

### 2. Environment Setup
```bash
# Backend .env (create backend/.env)
MONGO_URL="mongodb://localhost:27017"
NASA_API_KEY="9JjogYWIPOUHJKl7RMUmM0pUuepH6wiafS8zgs0d"

# Frontend .env (create frontend/.env)
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 3. Start Servers
```bash
# Terminal 1 - Backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend  
yarn start
```

---

## 📱 Access Your Application

- **🌐 Main App**: http://localhost:3000
- **🔧 Backend API**: http://localhost:8001  
- **📚 API Documentation**: http://localhost:8001/docs

---

## 🎯 What You'll See

**✅ Professional NASA Mission Control Interface**
- Real Mars satellite imagery (no white spaces!)
- Interactive telemetry dashboard (5 metrics including dust properties)
- Complete mission timeline with 12 major events
- Enhanced camera gallery with modal viewing
- Auto-play functionality for timeline progression
- Mobile-responsive design

**✅ Real NASA Data Integration**
- Perseverance rover telemetry
- Mars surface coordinates (Jezero Crater)
- Atmospheric conditions and dust monitoring
- Camera imagery from multiple instruments

---

## 🛑 Stop Servers

**If using start.sh**: Press `Ctrl+C` (stops both servers automatically)

**If running manually**: Press `Ctrl+C` in each terminal

---

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports 3000 and 8001
npx kill-port 3000 8001
```

### Missing Dependencies
```bash
# Reinstall everything
rm -rf frontend/node_modules backend/venv
./start.sh
```

### API Issues
- NASA API key is included and pre-configured
- Backend runs without MongoDB (uses mock data)
- Check http://localhost:8001/docs to test API directly

---

## 📦 Project Structure
```
mars-rover-mission-control/
├── start.sh              # 🚀 One-command startup script
├── frontend/             # ⚛️ React application  
├── backend/              # 🐍 FastAPI server
├── DEPLOYMENT.md         # 🌐 Vercel deployment guide
└── README.md            # 📖 Full documentation
```

**That's it! You're ready to explore Mars! 🌟**