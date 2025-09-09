# 🚀 Mars Rover Mission Control - Developer Setup

## ⚡ Choose Your Setup Method

### 🥇 **Option 1: Super Simple (Recommended)**
```bash
git clone <your-repo>
cd mars-rover-mission-control
npm run setup
```
✅ **One command does everything!**
- Installs all dependencies
- Creates environment files
- Starts both servers
- Opens browser automatically

---

### 🥈 **Option 2: Docker (Containerized)**
```bash
git clone <your-repo>
cd mars-rover-mission-control
npm run docker
```
✅ **Perfect for any environment!**
- No local Node.js/Python installation needed
- Consistent environment across all machines
- Automatic dependency management

---

### 🥉 **Option 3: Manual (Full Control)**
```bash
# Prerequisites: Node.js 16+, Python 3.8+

# 1. Clone repository
git clone <your-repo>
cd mars-rover-mission-control

# 2. Install dependencies
npm run install-deps

# 3. Create environment files
echo 'REACT_APP_BACKEND_URL=http://localhost:8001' > frontend/.env
echo 'NASA_API_KEY=9JjogYWIPOUHJKl7RMUmM0pUuepH6wiafS8zgs0d' > backend/.env

# 4. Start servers (2 terminals)
npm run backend   # Terminal 1
npm run frontend  # Terminal 2
```

---

## 📱 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Main App** | http://localhost:3000 | Mars Rover Mission Control Interface |
| **Backend API** | http://localhost:8001 | FastAPI Server |
| **API Docs** | http://localhost:8001/docs | Interactive API Documentation |

---

## 🎯 Development Features

### **🔥 Hot Reload**
- Frontend: Changes update instantly
- Backend: API changes update automatically
- No need to restart servers during development

### **🛠️ Debugging**
- **Frontend**: React DevTools, browser console
- **Backend**: FastAPI debug mode, detailed error messages
- **Network**: All API calls visible in browser DevTools

### **📊 Development Data**
- **NASA API**: Real Perseverance rover data
- **Mock Data**: Fallback for offline development
- **Test Data**: Comprehensive mission timeline with 12 events

---

## 🚨 Troubleshooting

### **Port Conflicts**
```bash
# Kill processes on ports 3000 and 8001
npx kill-port 3000 8001
```

### **Dependency Issues**
```bash
# Clean reinstall
rm -rf frontend/node_modules backend/venv
npm run setup
```

### **Docker Issues**
```bash
# Clean Docker setup
docker-compose down
docker system prune -f
npm run docker
```

### **Permission Issues (Linux/Mac)**
```bash
# Make scripts executable
chmod +x start.sh
```

---

## 📦 Project Structure

```
mars-rover-mission-control/
├── 🚀 start.sh              # One-command startup
├── 📦 package.json          # NPM scripts & metadata  
├── 🐳 docker-compose.yml    # Docker setup
├── 📖 QUICK_START.md        # User-friendly setup guide
├── 🔧 DEV_SETUP.md         # Developer setup guide
├── 🌐 DEPLOYMENT.md        # Vercel deployment guide
├── frontend/                # React application
│   ├── 🐳 Dockerfile       
│   ├── ⚛️ src/App.js       # Main React component
│   ├── 🎨 src/App.css      # NASA mission control styling
│   └── 📦 package.json     
└── backend/                 # FastAPI server
    ├── 🐳 Dockerfile       
    ├── 🐍 server.py        # Main FastAPI application
    ├── 📋 requirements.txt 
    └── ⚙️ .env             # Environment variables
```

---

## 🎨 Development Workflow

### **Making Changes**

1. **Frontend Changes**:
   - Edit files in `frontend/src/`
   - Changes appear instantly in browser
   - Check browser console for errors

2. **Backend Changes**:
   - Edit `backend/server.py`
   - Server restarts automatically
   - Test at http://localhost:8001/docs

3. **Styling Changes**:
   - Edit `frontend/src/App.css`
   - NASA mission control theme
   - Mobile-responsive design included

### **Testing Features**

- **Timeline Navigation**: Click events, use navigation buttons
- **Auto-play**: Test sequential event progression (SOL 0 → 1000)
- **Camera Gallery**: Modal viewing, metadata display, download
- **Telemetry**: Live data updates, grouping (Environmental/Systems/Atmospheric)
- **Map Interaction**: Zoom controls, position markers, satellite imagery

---

## 🌟 Next Steps

1. **Explore the Interface**: Professional NASA mission control design
2. **Test Auto-play**: Watch the rover's complete mission journey
3. **Check Mobile View**: Responsive design on all devices
4. **Deploy to Vercel**: `npm run deploy` for production

**Happy Mars exploring! 🌌**