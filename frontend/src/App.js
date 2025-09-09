import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Enhanced Mars Map component with satellite imagery and animations
const MarsMap = ({ route, currentPosition, selectedSol, onLocationClick }) => {
  const canvasRef = useRef(null);
  const [animationProgress, setAnimationProgress] = useState(1);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const animationRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas with Mars terrain background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#2d1810');
    gradient.addColorStop(0.3, '#4a2c1a');
    gradient.addColorStop(0.7, '#5d3426');
    gradient.addColorStop(1, '#3d2016');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add Mars terrain texture
    ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 5 + 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Add crater-like formations
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = Math.random() * 30 + 10;
      
      const craterGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      craterGradient.addColorStop(0, 'rgba(20, 10, 5, 0.8)');
      craterGradient.addColorStop(1, 'rgba(80, 40, 20, 0.3)');
      
      ctx.fillStyle = craterGradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    if (!route || route.length === 0) return;
    
    // Calculate bounds for the route
    const lats = route.map(p => p.lat);
    const lons = route.map(p => p.lon);
    const minLat = Math.min(...lats) - 0.002;
    const maxLat = Math.max(...lats) + 0.002;
    const minLon = Math.min(...lons) - 0.002;
    const maxLon = Math.max(...lons) + 0.002;
    
    // Convert lat/lon to canvas coordinates
    const latToY = (lat) => ((maxLat - lat) / (maxLat - minLat)) * height;
    const lonToX = (lon) => ((lon - minLon) / (maxLon - minLon)) * width;
    
    // Filter route up to selected sol with animation
    const filteredRoute = route.filter(point => point.sol <= selectedSol);
    const animatedRouteLength = Math.floor(filteredRoute.length * animationProgress);
    const animatedRoute = filteredRoute.slice(0, animatedRouteLength);
    
    if (animatedRoute.length > 1) {
      // Draw route path with glow effect
      ctx.shadowColor = '#e94d82';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#e94d82';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      animatedRoute.forEach((point, index) => {
        const x = lonToX(point.lon);
        const y = latToY(point.lat);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowBlur = 0;
      
      // Draw enhanced waypoints with interactive hover
      animatedRoute.forEach((point, index) => {
        const x = lonToX(point.lon);
        const y = latToY(point.lat);
        const isHovered = hoveredPoint === index;
        const isImportant = index % 20 === 0 || index === animatedRoute.length - 1;
        
        // Draw waypoint with enhanced styling
        if (index === animatedRoute.length - 1) {
          // Current position - pulsing effect
          const pulseSize = 8 + Math.sin(Date.now() * 0.005) * 2;
          ctx.fillStyle = '#00ff88';
          ctx.beginPath();
          ctx.arc(x, y, pulseSize, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        } else if (isImportant || isHovered) {
          // Important waypoints or hovered points
          const size = isHovered ? 8 : 5;
          ctx.fillStyle = isHovered ? '#ff6b9d' : '#e94d82';
          ctx.beginPath();
          ctx.arc(x, y, size, 0, 2 * Math.PI);
          ctx.fill();
          
          if (isHovered) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, size + 3, 0, 2 * Math.PI);
            ctx.stroke();
          }
        } else {
          // Regular waypoints
          ctx.fillStyle = 'rgba(233, 77, 130, 0.6)';
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
        
        // Enhanced sol labels for important points
        if (isImportant || isHovered) {
          ctx.fillStyle = '#ffffff';
          ctx.font = isHovered ? 'bold 12px monospace' : '10px monospace';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeText(`Sol ${point.sol}`, x + 10, y - 10);
          ctx.fillText(`Sol ${point.sol}`, x + 10, y - 10);
        }
      });
      
      // Draw mission milestones
      const milestones = [
        { sol: 0, label: "Landing", type: "landing" },
        { sol: 60, label: "First Sample", type: "sample" },
        { sol: 180, label: "Helicopter Flight", type: "flight" },
        { sol: 300, label: "Delta Formation", type: "exploration" },
        { sol: 500, label: "Sample Cache", type: "sample" },
        { sol: 800, label: "Canyon Exploration", type: "exploration" }
      ];
      
      milestones.forEach(milestone => {
        const routePoint = animatedRoute.find(p => p.sol >= milestone.sol);
        if (routePoint) {
          const x = lonToX(routePoint.lon);
          const y = latToY(routePoint.lat);
          
          // Draw milestone marker
          ctx.fillStyle = milestone.type === 'landing' ? '#ffd700' : 
                         milestone.type === 'sample' ? '#32cd32' : 
                         milestone.type === 'flight' ? '#00bfff' : '#ff69b4';
          
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw milestone icon
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'center';
          const icon = milestone.type === 'landing' ? '🛬' : 
                      milestone.type === 'sample' ? '🔬' : 
                      milestone.type === 'flight' ? '🚁' : '🔍';
          ctx.fillText(icon, x, y + 3);
          ctx.textAlign = 'left';
        }
      });
    }
    
    // Add landmark indicators
    const landmarks = [
      { lat: 18.4447, lon: 77.4508, name: "Landing Site", type: "landing" },
      { lat: 18.4455, lon: 77.4520, name: "Octavia E. Butler", type: "landing" },
      { lat: 18.4480, lon: 77.4600, name: "Crater Floor", type: "geological" }
    ];
    
    landmarks.forEach(landmark => {
      const x = lonToX(landmark.lon);
      const y = latToY(landmark.lat);
      
      // Draw landmark
      ctx.fillStyle = landmark.type === 'landing' ? 'rgba(255, 215, 0, 0.8)' : 'rgba(135, 206, 235, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.stroke();
    });
    
  }, [route, currentPosition, selectedSol, animationProgress, hoveredPoint]);
  
  // Animation effect when sol changes
  useEffect(() => {
    setAnimationProgress(0);
    const animate = () => {
      setAnimationProgress(prev => {
        if (prev >= 1) return 1;
        return prev + 0.05;
      });
    };
    
    animationRef.current = setInterval(animate, 50);
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [selectedSol]);
  
  // Handle mouse interactions
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to map coordinates and trigger location click
    if (onLocationClick) {
      onLocationClick({ x, y });
    }
  };
  
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if hovering over a waypoint
    if (route) {
      const filteredRoute = route.filter(point => point.sol <= selectedSol);
      const lats = route.map(p => p.lat);
      const lons = route.map(p => p.lon);
      const minLat = Math.min(...lats) - 0.002;
      const maxLat = Math.max(...lats) + 0.002;
      const minLon = Math.min(...lons) - 0.002;
      const maxLon = Math.max(...lons) + 0.002;
      
      const latToY = (lat) => ((maxLat - lat) / (maxLat - minLat)) * canvas.height;
      const lonToX = (lon) => ((lon - minLon) / (maxLon - minLon)) * canvas.width;
      
      let foundHover = null;
      filteredRoute.forEach((point, index) => {
        const x = lonToX(point.lon);
        const y = latToY(point.lat);
        const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
        
        if (distance < 15) { // 15px hover radius
          foundHover = index;
        }
      });
      
      setHoveredPoint(foundHover);
    }
  };
  
  return (
    <div className="mars-map">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={500}
        className="w-full h-full"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      />
    </div>
  );
};

// Enhanced Timeline with mission events
const Timeline = ({ sols, selectedSol, onSolChange }) => {
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const missionEvents = [
    { sol: 0, label: "🛬 Landing", color: "#ffd700" },
    { sol: 60, label: "🔬 First Sample", color: "#32cd32" },
    { sol: 180, label: "🚁 Helicopter", color: "#00bfff" },
    { sol: 300, label: "🏔️ Delta Exploration", color: "#ff69b4" },
    { sol: 500, label: "📦 Sample Cache", color: "#32cd32" },
    { sol: 800, label: "🔍 Canyon Survey", color: "#ff69b4" }
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
    <div className="timeline-container">
      <div className="timeline-info">
        <span>Sol {sols[0] || 0}</span>
        <span className="selected-sol">Sol {selectedSol}</span>
        <span>Sol {sols[sols.length - 1] || 0}</span>
      </div>
      
      {/* Mission Events Bar */}
      <div className="mission-events">
        {missionEvents.map((event, index) => {
          const eventSol = event.sol;
          const eventIndex = sols.indexOf(eventSol) || sols.findIndex(s => s >= eventSol);
          const eventPercentage = eventIndex >= 0 ? (eventIndex / (sols.length - 1)) * 100 : -10;
          
          if (eventPercentage >= 0 && eventPercentage <= 100) {
            return (
              <div 
                key={index}
                className="mission-event"
                style={{ 
                  left: `${eventPercentage}%`,
                  backgroundColor: event.color
                }}
                title={`Sol ${eventSol}: ${event.label}`}
                onClick={() => onSolChange(eventSol)}
              >
                <div className="event-marker"></div>
                <div className="event-tooltip">{event.label}</div>
              </div>
            );
          }
          return null;
        })}
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

// Enhanced Telemetry Dashboard with mini charts
const TelemetryDashboard = ({ metrics, selectedSol, historicalData }) => {
  const [chartData, setChartData] = useState({});
  
  useEffect(() => {
    // Generate historical chart data
    const sols = Array.from({length: 50}, (_, i) => Math.max(0, selectedSol - 49 + i));
    const batteryData = sols.map(sol => {
      const base = 90 - (sol * 0.01);
      const variation = 15 * Math.sin(sol * 0.5);
      return Math.max(30, Math.min(100, base + variation));
    });
    
    const tempData = sols.map(sol => {
      const base = -28.0;
      const seasonal = 10 * Math.sin(sol * 0.017);
      const daily = 25 * Math.sin(sol * 2.0);
      return parseFloat((base + seasonal + daily).toFixed(1));
    });
    
    const radiationData = sols.map(sol => {
      return parseFloat((0.24 + 0.03 * Math.sin(sol * 0.1)).toFixed(2));
    });
    
    setChartData({ sols, batteryData, tempData, radiationData });
  }, [selectedSol]);
  
  const MiniChart = ({ data, color, unit, currentValue }) => {
    const svgRef = useRef();
    
    useEffect(() => {
      if (!svgRef.current || !data) return;
      
      const svg = svgRef.current;
      const width = 100;
      const height = 30;
      
      // Clear previous content
      svg.innerHTML = '';
      
      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;
      
      // Create path
      const pathData = data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
      
      // Add path element
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');
      svg.appendChild(path);
      
      // Add current value indicator
      const currentX = width - 1;
      const currentY = height - ((currentValue - min) / range) * height;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', currentX);
      circle.setAttribute('cy', currentY);
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', color);
      svg.appendChild(circle);
      
    }, [data, color, currentValue]);
    
    return (
      <svg ref={svgRef} width="100" height="30" className="mini-chart">
      </svg>
    );
  };
  
  return (
    <div className="telemetry-dashboard">
      <div className="metric enhanced">
        <div className="metric-header">
          <span className="metric-label">Battery</span>
          <span className="metric-value">{metrics.charge}%</span>
        </div>
        <MiniChart 
          data={chartData.batteryData}
          color="#e94d82"
          unit="%"
          currentValue={metrics.charge}
        />
        <div className="metric-trend">
          {metrics.charge > 70 ? "🟢 Good" : metrics.charge > 40 ? "🟡 Fair" : "🔴 Low"}
        </div>
      </div>
      
      <div className="metric enhanced">
        <div className="metric-header">
          <span className="metric-label">Temperature</span>
          <span className="metric-value">{metrics.temperature}°C</span>
        </div>
        <MiniChart 
          data={chartData.tempData}
          color="#00bfff"
          unit="°C"
          currentValue={metrics.temperature}
        />
        <div className="metric-trend">
          {metrics.temperature > -10 ? "🔥 Warm" : metrics.temperature > -30 ? "❄️ Cold" : "🧊 Freezing"}
        </div>
      </div>
      
      <div className="metric enhanced">
        <div className="metric-header">
          <span className="metric-label">Radiation</span>
          <span className="metric-value">{metrics.radiation} μSv/h</span>
        </div>
        <MiniChart 
          data={chartData.radiationData}
          color="#32cd32"
          unit="μSv/h"
          currentValue={metrics.radiation}
        />
        <div className="metric-trend">
          {metrics.radiation < 0.3 ? "🟢 Normal" : "🟡 Elevated"}
        </div>
      </div>
    </div>
  );
};

// Enhanced Camera Images with zoom functionality
const CameraImages = ({ cameras }) => {
  const [selectedCamera, setSelectedCamera] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModal, setImageModal] = useState(false);
  
  if (!cameras || cameras.length === 0) {
    return (
      <div className="camera-section">
        <h3>📷 Camera Images</h3>
        <div className="no-images">No images available for this sol</div>
      </div>
    );
  }
  
  const openImageModal = (image, camera) => {
    setSelectedImage({ ...image, cameraName: camera.name });
    setImageModal(true);
  };
  
  const closeImageModal = () => {
    setImageModal(false);
    setSelectedImage(null);
  };
  
  return (
    <div className="camera-section">
      <h3>📷 Camera Images</h3>
      <div className="camera-tabs">
        {cameras.map((camera, index) => (
          <button
            key={index}
            className={`camera-tab ${selectedCamera === index ? 'active' : ''}`}
            onClick={() => setSelectedCamera(index)}
          >
            {camera.name}
            <span className="image-count">({camera.images.length})</span>
          </button>
        ))}
      </div>
      <div className="camera-images">
        {cameras[selectedCamera]?.images.slice(0, 6).map((image, index) => (
          <div key={index} className="camera-image" onClick={() => openImageModal(image, cameras[selectedCamera])}>
            <img 
              src={image.url} 
              alt={`${cameras[selectedCamera].name} ${index + 1}`}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOb3QgQXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
            <div className="image-overlay">
              <div className="image-info">
                <span className="image-time">{new Date(image.timestamp).toLocaleTimeString()}</span>
                <span className="image-zoom">🔍</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Image Modal */}
      {imageModal && selectedImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedImage.cameraName}</h3>
              <button className="close-button" onClick={closeImageModal}>×</button>
            </div>
            <div className="modal-image">
              <img src={selectedImage.url} alt={selectedImage.cameraName} />
            </div>
            <div className="modal-info">
              <div><strong>Timestamp:</strong> {selectedImage.timestamp}</div>
              <div><strong>Location:</strong> {selectedImage.location.lat.toFixed(4)}°, {selectedImage.location.lon.toFixed(4)}°</div>
            </div>
          </div>
        </div>
      )}
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
  
  const handleLocationClick = useCallback((location) => {
    console.log('Location clicked:', location);
    // Future enhancement: show location details
  }, []);
  
  useEffect(() => {
    fetchRoverData();
  }, [fetchRoverData]);
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner mars-themed"></div>
        <div className="loading-text">
          <div>🚀 Connecting to Mars...</div>
          <div className="loading-subtext">Loading Perseverance rover data</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-screen">
        <div className="error-icon">🛰️</div>
        <div className="error-message">{error}</div>
        <button onClick={() => fetchRoverData()} className="retry-button">
          🔄 Retry Connection
        </button>
      </div>
    );
  }
  
  if (!roverData) return null;
  
  return (
    <div className="App enhanced">
      {/* Enhanced Header */}
      <header className="app-header enhanced">
        <div className="header-left">
          <div className="mission-title">🚀 Mars Perseverance Rover</div>
          <div className="location-info">📍 Jezero Crater, Mars</div>
        </div>
        <div className="header-center">
          <div className="time-display">
            <span className="label">🌍 Earth Time</span>
            <span className="value">{new Date(roverData.header.earth_time).toISOString().slice(0, 19)}Z</span>
          </div>
          <div className="sol-display">
            <span className="label">☀️ Martian Sol</span>
            <span className="value">{roverData.header.sol}</span>
          </div>
          <div className="status-display">
            <span className="label">📡 Status</span>
            <span className={`status ${roverData.header.status.toLowerCase()}`}>
              {roverData.header.status === 'OPERATIONAL' ? '🟢' : 
               roverData.header.status === 'SLEEP' ? '🟡' : '🔴'} {roverData.header.status}
            </span>
          </div>
        </div>
        <div className="header-right">
          <div className="nasa-logo">🛰️ NASA</div>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content enhanced">
        {/* Map Section */}
        <div className="map-section">
          <MarsMap 
            route={roverData.map.route}
            currentPosition={roverData.map.current_position}
            selectedSol={selectedSol}
            onLocationClick={handleLocationClick}
          />
          
          {/* Enhanced Telemetry Overlay */}
          <TelemetryDashboard 
            metrics={roverData.overlays.metrics}
            selectedSol={selectedSol}
          />
        </div>

        {/* Enhanced Right Panel */}
        <div className="right-panel enhanced">
          <CameraImages cameras={roverData.cameras} />
          
          {/* Mission Summary */}
          <div className="mission-summary">
            <h3>🎯 Mission Status</h3>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Distance Traveled</span>
                <span className="stat-value">{(roverData.map.route.length * 0.05).toFixed(1)} km</span>
              </div>
              <div className="stat">
                <span className="stat-label">Samples Collected</span>
                <span className="stat-value">{Math.floor(selectedSol / 100)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Days on Mars</span>
                <span className="stat-value">{selectedSol}</span>
              </div>
            </div>
          </div>
          
          {/* Error Messages */}
          {roverData.errors && roverData.errors.length > 0 && (
            <div className="error-panel">
              <h3>⚠️ Alerts</h3>
              {roverData.errors.map((error, index) => (
                <div key={index} className="error-item">{error}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Timeline */}
      <div className="timeline-section enhanced">
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