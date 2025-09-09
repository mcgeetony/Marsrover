import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Map component using canvas for Mars terrain visualization
const MarsMap = ({ route, currentPosition, selectedSol }) => {
  const canvasRef = React.useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    if (!route || route.length === 0) return;
    
    // Calculate bounds for the route
    const lats = route.map(p => p.lat);
    const lons = route.map(p => p.lon);
    const minLat = Math.min(...lats) - 0.001;
    const maxLat = Math.max(...lats) + 0.001;
    const minLon = Math.min(...lons) - 0.001;
    const maxLon = Math.max(...lons) + 0.001;
    
    // Convert lat/lon to canvas coordinates
    const latToY = (lat) => ((maxLat - lat) / (maxLat - minLat)) * height;
    const lonToX = (lon) => ((lon - minLon) / (maxLon - minLon)) * width;
    
    // Draw Mars terrain background pattern
    ctx.fillStyle = '#2d1810';
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 3, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Filter route up to selected sol
    const filteredRoute = route.filter(point => point.sol <= selectedSol);
    
    if (filteredRoute.length > 1) {
      // Draw route path
      ctx.strokeStyle = '#e94d82';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      filteredRoute.forEach((point, index) => {
        const x = lonToX(point.lon);
        const y = latToY(point.lat);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Draw waypoints
      filteredRoute.forEach((point, index) => {
        const x = lonToX(point.lon);
        const y = latToY(point.lat);
        
        ctx.fillStyle = index === filteredRoute.length - 1 ? '#ff6b9d' : '#e94d82';
        ctx.beginPath();
        ctx.arc(x, y, index === filteredRoute.length - 1 ? 6 : 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add sol labels for key points
        if (index % 20 === 0 || index === filteredRoute.length - 1) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px monospace';
          ctx.fillText(`Sol ${point.sol}`, x + 8, y - 8);
        }
      });
    }
    
    // Draw current position
    if (currentPosition) {
      const x = lonToX(currentPosition.lon);
      const y = latToY(currentPosition.lat);
      
      // Pulsing current position indicator
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    
  }, [route, currentPosition, selectedSol]);
  
  return (
    <div className="mars-map">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={500}
        className="w-full h-full"
      />
    </div>
  );
};

// Timeline scrubber component
const Timeline = ({ sols, selectedSol, onSolChange }) => {
  const timelineRef = React.useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleInteraction = useCallback((e) => {
    if (!timelineRef.current || !sols.length) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const index = Math.floor(percentage * sols.length);
    const newSol = sols[Math.min(index, sols.length - 1)];
    
    if (newSol !== selectedSol) {
      onSolChange(newSol);
    }
  }, [sols, selectedSol, onSolChange]);
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleInteraction(e);
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      handleInteraction(e);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);
  
  const selectedIndex = sols.indexOf(selectedSol);
  const percentage = sols.length > 0 ? (selectedIndex / (sols.length - 1)) * 100 : 0;
  
  return (
    <div className="timeline-container">
      <div className="timeline-info">
        <span>Sol {sols[0] || 0}</span>
        <span className="selected-sol">Sol {selectedSol}</span>
        <span>Sol {sols[sols.length - 1] || 0}</span>
      </div>
      <div 
        ref={timelineRef}
        className="timeline-track"
        onMouseDown={handleMouseDown}
      >
        <div className="timeline-progress" style={{ width: `${percentage}%` }} />
        <div 
          className="timeline-thumb" 
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Camera images component
const CameraImages = ({ cameras }) => {
  const [selectedCamera, setSelectedCamera] = useState(0);
  
  if (!cameras || cameras.length === 0) {
    return (
      <div className="camera-section">
        <h3>Camera Images</h3>
        <div className="no-images">No images available for this sol</div>
      </div>
    );
  }
  
  return (
    <div className="camera-section">
      <h3>Camera Images</h3>
      <div className="camera-tabs">
        {cameras.map((camera, index) => (
          <button
            key={index}
            className={`camera-tab ${selectedCamera === index ? 'active' : ''}`}
            onClick={() => setSelectedCamera(index)}
          >
            {camera.name}
          </button>
        ))}
      </div>
      <div className="camera-images">
        {cameras[selectedCamera]?.images.slice(0, 4).map((image, index) => (
          <div key={index} className="camera-image">
            <img 
              src={image.url} 
              alt={`${cameras[selectedCamera].name} ${index + 1}`}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOb3QgQXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Main App component
function App() {
  const [roverData, setRoverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSol, setSelectedSol] = useState(null);
  
  const fetchRoverData = useCallback(async (sol = null) => {
    try {
      setLoading(true);
      const endpoint = sol ? `/rover-data/${sol}` : '/rover-data';
      const response = await axios.get(`${API}${endpoint}`);
      setRoverData(response.data);
      setSelectedSol(response.data.header.sol);
      setError(null);
    } catch (err) {
      console.error('Error fetching rover data:', err);
      setError('Failed to fetch rover data');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const handleSolChange = useCallback((newSol) => {
    if (newSol !== selectedSol) {
      fetchRoverData(newSol);
    }
  }, [selectedSol, fetchRoverData]);
  
  useEffect(() => {
    fetchRoverData();
  }, [fetchRoverData]);
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <div>Loading Mars rover data...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-screen">
        <div className="error-message">{error}</div>
        <button onClick={() => fetchRoverData()} className="retry-button">
          Retry
        </button>
      </div>
    );
  }
  
  if (!roverData) return null;
  
  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="mission-title">Mars Perseverance Rover</div>
          <div className="location-info">Jezero Crater, Mars</div>
        </div>
        <div className="header-center">
          <div className="time-display">
            <span className="label">Earth Time:</span>
            <span className="value">{new Date(roverData.header.earth_time).toISOString().slice(0, 19)}Z</span>
          </div>
          <div className="sol-display">
            <span className="label">Sol:</span>
            <span className="value">{roverData.header.sol}</span>
          </div>
          <div className="status-display">
            <span className="label">Status:</span>
            <span className={`status ${roverData.header.status.toLowerCase()}`}>
              {roverData.header.status}
            </span>
          </div>
        </div>
        <div className="header-right">
          <div className="nasa-logo">NASA</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {/* Map Section */}
        <div className="map-section">
          <MarsMap 
            route={roverData.map.route}
            currentPosition={roverData.map.current_position}
            selectedSol={selectedSol}
          />
          
          {/* Telemetry Overlay */}
          <div className="telemetry-overlay">
            <div className="metric">
              <span className="metric-label">Battery</span>
              <span className="metric-value">{roverData.overlays.metrics.charge}%</span>
            </div>
            <div className="metric">
              <span className="metric-label">Temperature</span>
              <span className="metric-value">{roverData.overlays.metrics.temperature}°C</span>
            </div>
            <div className="metric">
              <span className="metric-label">Radiation</span>
              <span className="metric-value">{roverData.overlays.metrics.radiation} μSv/h</span>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <CameraImages cameras={roverData.cameras} />
          
          {/* Error Messages */}
          {roverData.errors && roverData.errors.length > 0 && (
            <div className="error-panel">
              <h3>Alerts</h3>
              {roverData.errors.map((error, index) => (
                <div key={index} className="error-item">{error}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline-section">
        <Timeline 
          sols={roverData.timeline.sols}
          selectedSol={selectedSol}
          onSolChange={handleSolChange}
        />
      </div>
    </div>
  );
}

export default App;