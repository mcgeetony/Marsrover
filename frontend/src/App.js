import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Professional NASA Mars Map with real satellite imagery
const NASAMarsMap = ({ route, currentPosition, selectedSol, onLocationClick }) => {
  const mapRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Calculate route bounds
  const getRouteBounds = () => {
    if (!route || route.length === 0) return null;
    
    const lats = route.map(p => p.lat);
    const lons = route.map(p => p.lon);
    return {
      minLat: Math.min(...lats) - 0.002,
      maxLat: Math.max(...lats) + 0.002,
      minLon: Math.min(...lons) - 0.002,
      maxLon: Math.max(...lons) + 0.002
    };
  };
  
  // Convert lat/lon to percentage position
  const coordToPercent = (lat, lon) => {
    const bounds = getRouteBounds();
    if (!bounds) return { x: 50, y: 50 };
    
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100;
    
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };
  
  const filteredRoute = route ? route.filter(point => point.sol <= selectedSol) : [];
  
  return (
    <div className="nasa-mars-map" ref={mapRef}>
      {/* Real Mars satellite imagery background */}
      <div className="mars-satellite-background"></div>
      
      {/* Exploration Zone Circle */}
      <div className="exploration-zone"></div>
      
      {/* Route Path using SVG */}
      <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {filteredRoute.length > 1 && (
          <polyline
            points={filteredRoute.map(point => {
              const pos = coordToPercent(point.lat, point.lon);
              return `${pos.x},${pos.y}`;
            }).join(' ')}
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2,1"
          />
        )}
      </svg>
      
      {/* Sample Collection Points */}
      {filteredRoute.map((point, index) => {
        if (point.sol % 60 !== 0) return null; // Only sample points
        
        const pos = coordToPercent(point.lat, point.lon);
        
        return (
          <div
            key={`sample-${index}`}
            className="nasa-sample-pin"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`
            }}
            title={`Sample ${Math.floor(point.sol / 60)} - Sol ${point.sol}`}
          >
            <div className="nasa-pin-marker">
              {Math.floor(point.sol / 60)}
            </div>
          </div>
        );
      })}
      
      {/* Rover Positions */}
      {filteredRoute.filter((_, index) => index % 50 === 0).map((point, index) => {
        const pos = coordToPercent(point.lat, point.lon);
        const isCurrentPosition = point.sol === selectedSol;
        
        return (
          <div
            key={`rover-${index}`}
            className={`nasa-rover-position ${isCurrentPosition ? 'current' : ''}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`
            }}
            title={`Rover Position - Sol ${point.sol}`}
          >
            <div className="rover-diamond">
              {isCurrentPosition && <div className="rover-pulse"></div>}
            </div>
          </div>
        );
      })}
      
      {/* Map Controls */}
      <div className="nasa-map-controls">
        <div className="zoom-controls">
          <button onClick={() => setZoomLevel(prev => Math.min(prev * 1.2, 3))}>+</button>
          <div className="zoom-value">{Math.round(zoomLevel * 100)}%</div>
          <button onClick={() => setZoomLevel(prev => Math.max(prev * 0.8, 0.5))}>-</button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Telemetry Card with Graphs
const NASATelemetryCard = ({ title, value, unit, data, color, type, subtitle }) => {
  const chartRef = useRef(null);
  
  useEffect(() => {
    if (!chartRef.current || !data) return;
    
    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (type === 'line') {
      // Line chart
      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      data.forEach((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Fill area
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = color;
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      
    } else if (type === 'bar') {
      // Bar chart
      const max = Math.max(...data);
      const barWidth = width / data.length;
      
      data.forEach((value, index) => {
        const barHeight = (value / max) * height;
        const x = index * barWidth;
        const y = height - barHeight;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
      });
    }
    
  }, [data, color, type, value]);
  
  return (
    <div className="nasa-telemetry-card">
      <div className="card-header">
        <div className="card-icon">●</div>
        <div className="card-info">
          <div className="card-title">{title}</div>
          {subtitle && <div className="card-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="card-main-value">
        <span className="main-number">{value}</span>
        <span className="main-unit">{unit}</span>
      </div>
      <div className="card-chart">
        <canvas ref={chartRef} width={150} height={60} />
      </div>
      <div className="card-stats">
        <div className="stat-item">
          <span className="stat-label">MIN</span>
          <span className="stat-value">{Math.min(...(data || [0])).toFixed(0)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">MAX</span>
          <span className="stat-value">{Math.max(...(data || [0])).toFixed(0)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">NOW</span>
          <span className="stat-value">{value}</span>
        </div>
      </div>
    </div>
  );
};

// NASA Style Camera Gallery
const NASACameraGallery = ({ cameras }) => {
  const [selectedCamera, setSelectedCamera] = useState(0);
  
  if (!cameras || cameras.length === 0) {
    return (
      <div className="nasa-camera-section">
        <div className="section-header">
          <h3>CAMERA SYSTEMS</h3>
          <div className="image-count">0 Images</div>
        </div>
        <div className="no-images">No images available</div>
      </div>
    );
  }
  
  const totalImages = cameras.reduce((acc, cam) => acc + cam.images.length, 0);
  
  return (
    <div className="nasa-camera-section">
      <div className="section-header">
        <h3>CAMERA SYSTEMS</h3>
        <div className="image-count">{totalImages} Images</div>
      </div>
      
      <div className="camera-tabs">
        {cameras.map((camera, index) => (
          <button
            key={index}
            className={`nasa-camera-tab ${selectedCamera === index ? 'active' : ''}`}
            onClick={() => setSelectedCamera(index)}
          >
            {camera.name.replace('Camera', '').replace('Navigation', 'NAV')} • {camera.images.length}
          </button>
        ))}
      </div>
      
      <div className="nasa-camera-grid">
        {cameras[selectedCamera]?.images.slice(0, 8).map((image, index) => (
          <div key={index} className="nasa-camera-image">
            <img 
              src={image.url} 
              alt={`${cameras[selectedCamera].name} ${index + 1}`}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5PIElNQUdFPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// NASA Timeline Component
const NASATimeline = ({ sols, selectedSol, onSolChange }) => {
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const missionEvents = [
    { sol: 0, label: "LANDING AT JEZERO", shortLabel: "LANDING", type: "critical" },
    { sol: 60, label: "FIRST ROCK SAMPLE", shortLabel: "FIRST SAMPLE", type: "success" },
    { sol: 180, label: "INGENUITY FLIGHT", shortLabel: "HELICOPTER", type: "flight" },
    { sol: 300, label: "DELTA EXPLORATION", shortLabel: "DELTA EXPL", type: "exploration" },
    { sol: 500, label: "SAMPLE DEPOT", shortLabel: "SAMPLE DEPOT", type: "success" },
    { sol: 1000, label: "ANCIENT LAKE", shortLabel: "ANCIENT LAKE", type: "discovery" }
  ];
  
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
    <div className="nasa-timeline">
      <div className="timeline-header">
        <div className="timeline-title">
          <h3>MISSION TIMELINE</h3>
          <div className="timeline-subtitle">OPERATIONAL TIMELINE FLOW & EVENTS</div>
        </div>
        <div className="current-sol-display">
          <div className="sol-label">CURRENT SOL</div>
          <div className="sol-number">{selectedSol}</div>
        </div>
      </div>
      
      <div className="timeline-track-container">
        <div 
          ref={timelineRef}
          className="nasa-timeline-track"
          onMouseDown={handleMouseDown}
        >
          <div className="timeline-background" />
          <div className="timeline-progress" style={{ width: `${percentage}%` }} />
          
          {/* Mission Events */}
          {missionEvents.map((event, index) => {
            const eventSol = event.sol;
            const eventIndex = sols.indexOf(eventSol) || sols.findIndex(s => s >= eventSol);
            const eventPercentage = eventIndex >= 0 ? (eventIndex / (sols.length - 1)) * 100 : -10;
            
            if (eventPercentage >= 0 && eventPercentage <= 100) {
              return (
                <div 
                  key={index}
                  className={`nasa-timeline-event ${event.type} ${selectedSol >= eventSol ? 'completed' : 'upcoming'}`}
                  style={{ left: `${eventPercentage}%` }}
                  onClick={() => onSolChange(eventSol)}
                >
                  <div className="event-marker">
                    <div className="event-dot"></div>
                  </div>
                  <div className="event-label">
                    <div className="event-title">{event.shortLabel}</div>
                    <div className="event-sol">SOL {eventSol}</div>
                  </div>
                </div>
              );
            }
            return null;
          })}
          
          <div 
            className="nasa-timeline-thumb" 
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
      
      <div className="timeline-navigation">
        <button onClick={() => onSolChange(Math.max(sols[0], selectedSol - 50))} disabled={selectedSol <= sols[0]}>
          ⏪ -50 SOLS
        </button>
        <button onClick={() => onSolChange(Math.max(sols[0], selectedSol - 10))} disabled={selectedSol <= sols[0]}>
          ⏮ -10 SOLS
        </button>
        <button onClick={() => onSolChange(Math.max(sols[0], selectedSol - 1))} disabled={selectedSol <= sols[0]}>
          ⏮ -1 SOLS
        </button>
        <button className="home-btn" onClick={() => onSolChange(1000)}>
          ⌂
        </button>
        <button onClick={() => onSolChange(Math.min(sols[sols.length - 1], selectedSol + 1))} disabled={selectedSol >= sols[sols.length - 1]}>
          ⏭ +1 SOLS
        </button>
        <button onClick={() => onSolChange(Math.min(sols[sols.length - 1], selectedSol + 10))} disabled={selectedSol >= sols[sols.length - 1]}>
          ⏭ +10 SOLS
        </button>
        <button onClick={() => onSolChange(Math.min(sols[sols.length - 1], selectedSol + 50))} disabled={selectedSol >= sols[sols.length - 1]}>
          +50 SOLS ⏩
        </button>
      </div>
    </div>
  );
};

// Main App
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
      setError('Communication link lost');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const handleSolChange = useCallback((newSol) => {
    if (newSol !== selectedSol) {
      fetchRoverData(newSol);
    }
  }, [selectedSol, fetchRoverData]);
  
  const handleLocationClick = useCallback((location) => {
    console.log('Location clicked:', location);
  }, []);
  
  useEffect(() => {
    fetchRoverData();
  }, [fetchRoverData]);
  
  if (loading) {
    return (
      <div className="nasa-loading">
        <div className="loading-container">
          <div className="nasa-loading-spinner"></div>
          <div className="loading-text">
            <div className="primary-text">NASA MARS MISSION CONTROL</div>
            <div className="secondary-text">Establishing connection to Perseverance rover...</div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="nasa-error">
        <div className="error-container">
          <div className="error-icon">⚠</div>
          <div className="error-text">
            <div className="error-title">{error}</div>
            <div className="error-subtitle">Unable to establish communication link</div>
          </div>
          <button onClick={() => fetchRoverData()} className="nasa-button">
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }
  
  if (!roverData) return null;
  
  // Generate telemetry data
  const generateTelemetryData = (baseValue, variation, sols = 50) => {
    return Array.from({length: sols}, (_, i) => {
      const sol = Math.max(0, selectedSol - sols + i + 1);
      return Math.max(0, baseValue + variation * Math.sin(sol * 0.1) + (Math.random() - 0.5) * variation * 0.2);
    });
  };
  
  const tempData = generateTelemetryData(203, 20); // Kelvin
  const windData = generateTelemetryData(32, 15); // KMH
  const radiationData = generateTelemetryData(203, 30); // Counts
  const distanceData = generateTelemetryData(2, 0.5); // m/sec
  const dustData = generateTelemetryData(203, 40); // Particle count
  
  return (
    <div className="nasa-app">
      {/* NASA Header */}
      <header className="nasa-header">
        <div className="header-left">
          <div className="nasa-logo">NASA</div>
          <div className="mission-info">
            <div className="mission-name">MARS PERSEVERANCE</div>
            <div className="mission-location">JPL • JEZERO CRATER • MARS</div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="status-group">
            <div className="status-item">
              <div className="status-label">EARTH TIME</div>
              <div className="status-value">{new Date(roverData.header.earth_time).toISOString().slice(0, 19).replace('T', ' | ')}</div>
            </div>
            <div className="status-item">
              <div className="status-label">MISSION SOL</div>
              <div className="status-value">{roverData.header.sol}</div>
            </div>
            <div className="status-item">
              <div className="status-label">SYSTEM STATUS</div>
              <div className={`status-value status-${roverData.header.status.toLowerCase()}`}>
                {roverData.header.status}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Interface */}
      <div className="nasa-main">
        {/* Left Panel - Enhanced Telemetry */}
        <div className="nasa-left-panel">
          <div className="panel-header">
            <h3>TELEMETRY DATA</h3>
            <div className="live-indicator">LIVE</div>
          </div>
          
          <div className="telemetry-stack">
            <NASATelemetryCard
              title="Temperature"
              value="203"
              unit="K (-70°C)"
              data={tempData}
              color="#00ff88"
              type="line"
              subtitle="AVERAGE 200K | RANGE 180K-220K"
            />
            
            <NASATelemetryCard
              title="Wind Speed"
              value="32"
              unit="KMH"
              data={windData}
              color="#0ea5e9"
              type="bar"
              subtitle="MAX 45 KMH | DIR NE"
            />
            
            <NASATelemetryCard
              title="Radiation"
              value="203"
              unit="K"
              data={radiationData}
              color="#f59e0b"
              type="bar"
              subtitle="LEVEL NORMAL | SAFE RANGE"
            />
            
            <NASATelemetryCard
              title="Distance Traveled"
              value="+2"
              unit="m/sec"
              data={distanceData}
              color="#10b981"
              type="line"
              subtitle="72 KM/H AVG | 1 HR 12 MIN"
            />
            
            <NASATelemetryCard
              title="Dust Properties"
              value="203"
              unit="K"
              data={dustData}
              color="#8b5cf6"
              type="bar"
              subtitle="PARTICLE COUNT | VISIBILITY GOOD"
            />
          </div>
        </div>

        {/* Center Panel - NASA Mars Map */}
        <div className="nasa-center-panel">
          <div className="map-header">
            <div className="map-info">
              <div className="map-title">SURFACE OPERATIONS MAP</div>
              <div className="map-coordinates">
                {roverData.map.current_position.lat.toFixed(4)}°N, {roverData.map.current_position.lon.toFixed(4)}°E | Elevation: 4559 M
              </div>
            </div>
          </div>
          
          <NASAMarsMap 
            route={roverData.map.route}
            currentPosition={roverData.map.current_position}
            selectedSol={selectedSol}
            onLocationClick={handleLocationClick}
          />
        </div>

        {/* Right Panel - Camera Systems */}
        <div className="nasa-right-panel">
          <NASACameraGallery cameras={roverData.cameras} />
        </div>
      </div>

      {/* Fixed Bottom Timeline */}
      <div className="nasa-timeline-container">
        <NASATimeline 
          sols={roverData.timeline.sols}
          selectedSol={selectedSol}
          onSolChange={handleSolChange}
        />
      </div>
    </div>
  );
}

export default App;