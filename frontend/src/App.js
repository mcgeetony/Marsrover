import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Carbon-inspired Mars Map with realistic satellite imagery
const CarbonMarsMap = ({ route, currentPosition, selectedSol, onLocationClick }) => {
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
    
    // Clear canvas with realistic Mars terrain background
    const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
    gradient.addColorStop(0, '#8B4513');  // Mars brown center
    gradient.addColorStop(0.3, '#A0522D'); // Saddle brown
    gradient.addColorStop(0.6, '#CD853F'); // Peru
    gradient.addColorStop(1, '#654321');   // Dark brown edges
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add realistic Mars surface details - Jezero Crater formations
    ctx.globalAlpha = 0.6;
    
    // Crater rim and geological features
    const craterCenterX = width * 0.6;
    const craterCenterY = height * 0.5;
    const craterRadius = Math.min(width, height) * 0.3;
    
    // Draw crater rim
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(craterCenterX, craterCenterY, craterRadius, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Add delta formation (fan-shaped deposits)
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.moveTo(craterCenterX - 50, craterCenterY + 20);
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI / 12) - Math.PI / 6;
      const x = craterCenterX + Math.cos(angle) * 80;
      const y = craterCenterY + Math.sin(angle) * 60;
      ctx.lineTo(x, y);
    }
    ctx.fill();
    
    // Add rocky outcrops and surface texture
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 8 + 2;
      const alpha = Math.random() * 0.4 + 0.2;
      
      ctx.globalAlpha = alpha;
      ctx.fillStyle = Math.random() > 0.5 ? '#6D4C41' : '#5D4037';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    
    if (!route || route.length === 0) return;
    
    // Calculate bounds for the route
    const lats = route.map(p => p.lat);
    const lons = route.map(p => p.lon);
    const minLat = Math.min(...lats) - 0.003;
    const maxLat = Math.max(...lats) + 0.003;
    const minLon = Math.min(...lons) - 0.003;
    const maxLon = Math.max(...lons) + 0.003;
    
    // Convert lat/lon to canvas coordinates
    const latToY = (lat) => ((maxLat - lat) / (maxLat - minLat)) * height;
    const lonToX = (lon) => ((lon - minLon) / (maxLon - minLon)) * width;
    
    // Filter route up to selected sol with animation
    const filteredRoute = route.filter(point => point.sol <= selectedSol);
    const animatedRouteLength = Math.floor(filteredRoute.length * animationProgress);
    const animatedRoute = filteredRoute.slice(0, animatedRouteLength);
    
    if (animatedRoute.length > 1) {
      // Draw route path - Carbon Blue theme
      ctx.shadowColor = '#0f62fe';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#0f62fe';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      
      // Draw smooth curved path
      for (let i = 0; i < animatedRoute.length; i++) {
        const x = lonToX(animatedRoute[i].lon);
        const y = latToY(animatedRoute[i].lat);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else if (i === animatedRoute.length - 1) {
          ctx.lineTo(x, y);
        } else {
          const nextX = lonToX(animatedRoute[i + 1].lon);
          const nextY = latToY(animatedRoute[i + 1].lat);
          const cpX = (x + nextX) / 2;
          const cpY = (y + nextY) / 2;
          ctx.quadraticCurveTo(x, y, cpX, cpY);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw sample collection points and waypoints
      animatedRoute.forEach((point, index) => {
        const x = lonToX(point.lon);
        const y = latToY(point.lat);
        const isHovered = hoveredPoint === index;
        const isSamplePoint = point.sol % 60 === 0; // Sample every 60 sols
        const isCurrentPosition = index === animatedRoute.length - 1;
        
        if (isCurrentPosition) {
          // Current position - pulsing rover indicator
          const pulseSize = 12 + Math.sin(Date.now() * 0.008) * 3;
          
          // Rover base
          ctx.fillStyle = '#0f62fe';
          ctx.beginPath();
          ctx.arc(x, y, pulseSize, 0, 2 * Math.PI);
          ctx.fill();
          
          // Rover center
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
          
          // Rover direction indicator
          ctx.strokeStyle = '#0f62fe';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 15, y - 10);
          ctx.stroke();
          
        } else if (isSamplePoint) {
          // Sample collection points - Red pins like in the image
          const pinHeight = 20;
          const pinWidth = 12;
          
          // Pin shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(x + 2, y + pinHeight + 2, pinWidth/2, 0, 2 * Math.PI);
          ctx.fill();
          
          // Pin body
          ctx.fillStyle = '#da1e28'; // Carbon Red
          ctx.beginPath();
          ctx.arc(x, y, pinWidth/2, 0, 2 * Math.PI);
          ctx.fill();
          
          // Pin point
          ctx.beginPath();
          ctx.moveTo(x, y + pinWidth/2);
          ctx.lineTo(x, y + pinHeight);
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#da1e28';
          ctx.stroke();
          
          // Sample number
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Chakra Petch, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(Math.floor(point.sol / 60), x, y + 3);
          ctx.textAlign = 'left';
          
        } else if (index % 20 === 0 || isHovered) {
          // Important waypoints - smaller blue dots
          const size = isHovered ? 8 : 4;
          ctx.fillStyle = isHovered ? '#78a9ff' : '#0f62fe';
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
        }
        
        // Sol labels for important points
        if ((index % 40 === 0 || isHovered) && !isCurrentPosition) {
          ctx.fillStyle = '#f4f4f4';
          ctx.font = isHovered ? 'bold 11px Chakra Petch, monospace' : '9px Chakra Petch, monospace';
          ctx.strokeStyle = '#161616';
          ctx.lineWidth = 3;
          ctx.strokeText(`Sol ${point.sol}`, x + 12, y - 8);
          ctx.fillText(`Sol ${point.sol}`, x + 12, y - 8);
        }
      });
      
      // Add exploration zones and geological features
      const explorationZones = [
        { x: width * 0.2, y: height * 0.3, name: "NERETVA VALLIS", type: "geological" },
        { x: width * 0.6, y: height * 0.4, name: "BELVA CRATER", type: "crater" },
        { x: width * 0.8, y: height * 0.7, name: "DELTA FORMATION", type: "geological" }
      ];
      
      explorationZones.forEach(zone => {
        // Zone circle
        ctx.strokeStyle = '#78a9ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, 40, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Zone label
        ctx.fillStyle = '#f4f4f4';
        ctx.font = 'bold 12px Chakra Petch, monospace';
        ctx.strokeStyle = '#161616';
        ctx.lineWidth = 3;
        ctx.strokeText(zone.name, zone.x - 40, zone.y - 50);
        ctx.fillText(zone.name, zone.x - 40, zone.y - 50);
      });
    }
    
    // Add coordinate grid overlay
    ctx.strokeStyle = 'rgba(244, 244, 244, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      const y = (i / 10) * height;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
  }, [route, currentPosition, selectedSol, animationProgress, hoveredPoint]);
  
  // Animation effect when sol changes
  useEffect(() => {
    setAnimationProgress(0);
    const animate = () => {
      setAnimationProgress(prev => {
        if (prev >= 1) return 1;
        return prev + 0.03;
      });
    };
    
    animationRef.current = setInterval(animate, 40);
    
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
    
    if (onLocationClick) {
      onLocationClick({ x, y });
    }
  };
  
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (route) {
      const filteredRoute = route.filter(point => point.sol <= selectedSol);
      const lats = route.map(p => p.lat);
      const lons = route.map(p => p.lon);
      const minLat = Math.min(...lats) - 0.003;
      const maxLat = Math.max(...lats) + 0.003;
      const minLon = Math.min(...lons) - 0.003;
      const maxLon = Math.max(...lons) + 0.003;
      
      const latToY = (lat) => ((maxLat - lat) / (maxLat - minLat)) * canvas.height;
      const lonToX = (lon) => ((lon - minLon) / (maxLon - minLon)) * canvas.width;
      
      let foundHover = null;
      filteredRoute.forEach((point, index) => {
        const x = lonToX(point.lon);
        const y = latToY(point.lat);
        const distance = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
        
        if (distance < 15) {
          foundHover = index;
        }
      });
      
      setHoveredPoint(foundHover);
    }
  };
  
  return (
    <div className="carbon-mars-map">
      <canvas 
        ref={canvasRef} 
        width={1000} 
        height={600}
        className="mars-terrain-canvas"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      />
    </div>
  );
};

// Carbon FUI Timeline
const CarbonTimeline = ({ sols, selectedSol, onSolChange }) => {
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const missionEvents = [
    { sol: 0, label: "Landing", type: "critical", icon: "⬇" },
    { sol: 60, label: "First Sample", type: "success", icon: "⚗" },
    { sol: 180, label: "Helicopter", type: "info", icon: "🚁" },
    { sol: 300, label: "Delta Exploration", type: "info", icon: "🔍" },
    { sol: 500, label: "Sample Cache", type: "success", icon: "📦" },
    { sol: 800, label: "Canyon Survey", type: "info", icon: "🏔" }
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
    <div className="carbon-timeline">
      <div className="timeline-header">
        <div className="timeline-info">
          <span className="timeline-label">Mission Timeline</span>
          <span className="timeline-range">Sol {sols[0] || 0} - Sol {sols[sols.length - 1] || 0}</span>
        </div>
        <div className="selected-sol-display">
          <span className="sol-label">Current Sol</span>
          <span className="sol-value">{selectedSol}</span>
        </div>
      </div>
      
      <div className="timeline-track-container">
        <div 
          ref={timelineRef}
          className="carbon-timeline-track"
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
                  className={`timeline-event ${event.type}`}
                  style={{ left: `${eventPercentage}%` }}
                  onClick={() => onSolChange(eventSol)}
                  title={`Sol ${eventSol}: ${event.label}`}
                >
                  <div className="event-marker">
                    <span className="event-icon">{event.icon}</span>
                  </div>
                  <div className="event-tooltip">
                    <div className="tooltip-title">{event.label}</div>
                    <div className="tooltip-sol">Sol {eventSol}</div>
                  </div>
                </div>
              );
            }
            return null;
          })}
          
          <div 
            className="timeline-thumb" 
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Carbon Telemetry Cards
const CarbonTelemetryCard = ({ title, value, unit, trend, data, color, icon }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current || !data) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    // Draw chart line
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
    
    // Draw fill area
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = color;
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Draw current value point
    const currentX = width - 2;
    const currentY = height - ((value || data[data.length - 1] || 0) - min) / range * height;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 3, 0, 2 * Math.PI);
    ctx.fill();
    
  }, [data, value, color]);
  
  return (
    <div className="carbon-telemetry-card">
      <div className="card-header">
        <div className="card-icon">{icon}</div>
        <div className="card-title">{title}</div>
      </div>
      <div className="card-value">
        <span className="value-number">{value}</span>
        <span className="value-unit">{unit}</span>
      </div>
      <div className="card-chart">
        <canvas ref={canvasRef} width={120} height={40} />
      </div>
      <div className={`card-trend ${trend.type}`}>
        <span className="trend-icon">{trend.icon}</span>
        <span className="trend-text">{trend.text}</span>
      </div>
    </div>
  );
};

// Enhanced Camera Gallery with Carbon styling
const CarbonCameraGallery = ({ cameras }) => {
  const [selectedCamera, setSelectedCamera] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModal, setImageModal] = useState(false);
  
  if (!cameras || cameras.length === 0) {
    return (
      <div className="carbon-camera-section">
        <div className="section-header">
          <h3 className="section-title">Camera Systems</h3>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <div className="empty-text">No images available for this sol</div>
        </div>
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
    <div className="carbon-camera-section">
      <div className="section-header">
        <h3 className="section-title">Camera Systems</h3>
        <div className="camera-count">{cameras.reduce((acc, cam) => acc + cam.images.length, 0)} Images</div>
      </div>
      
      <div className="camera-tabs">
        {cameras.map((camera, index) => (
          <button
            key={index}
            className={`carbon-tab ${selectedCamera === index ? 'active' : ''}`}
            onClick={() => setSelectedCamera(index)}
          >
            <span className="tab-text">{camera.name}</span>
            <span className="tab-badge">{camera.images.length}</span>
          </button>
        ))}
      </div>
      
      <div className="camera-grid">
        {cameras[selectedCamera]?.images.slice(0, 8).map((image, index) => (
          <div 
            key={index} 
            className="camera-image-card"
            onClick={() => openImageModal(image, cameras[selectedCamera])}
          >
            <div className="image-container">
              <img 
                src={image.url} 
                alt={`${cameras[selectedCamera].name} ${index + 1}`}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjYyNjI2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJDaGFrcmEgUGV0Y2gsIG1vbm9zcGFjZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2Y0ZjRmNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBBdmFpbGFibGU8L3RleHQ+PC9zdmc+';
                }}
              />
              <div className="image-overlay">
                <div className="overlay-content">
                  <div className="image-timestamp">
                    {new Date(image.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="expand-icon">⤢</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Enhanced Image Modal */}
      {imageModal && selectedImage && (
        <div className="carbon-modal-overlay" onClick={closeImageModal}>
          <div className="carbon-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span className="camera-name">{selectedImage.cameraName}</span>
                <span className="image-timestamp">{selectedImage.timestamp}</span>
              </div>
              <button className="modal-close" onClick={closeImageModal}>✕</button>
            </div>
            <div className="modal-content">
              <div className="modal-image">
                <img src={selectedImage.url} alt={selectedImage.cameraName} />
              </div>
              <div className="modal-metadata">
                <div className="metadata-row">
                  <span className="metadata-label">Location:</span>
                  <span className="metadata-value">
                    {selectedImage.location.lat.toFixed(5)}°N, {selectedImage.location.lon.toFixed(5)}°E
                  </span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Camera:</span>
                  <span className="metadata-value">{selectedImage.cameraName}</span>
                </div>
                <div className="metadata-row">
                  <span className="metadata-label">Timestamp:</span>
                  <span className="metadata-value">{new Date(selectedImage.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App with Carbon FUI Design
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
      <div className="carbon-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            <div className="primary-text">Establishing Mars Link</div>
            <div className="secondary-text">Synchronizing with Perseverance rover...</div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="carbon-error">
        <div className="error-container">
          <div className="error-icon">⚠</div>
          <div className="error-text">
            <div className="error-title">{error}</div>
            <div className="error-subtitle">Unable to establish connection with Mars Operations</div>
          </div>
          <button onClick={() => fetchRoverData()} className="carbon-button">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }
  
  if (!roverData) return null;
  
  // Generate telemetry chart data
  const generateChartData = (baseValue, variation, sols = 50) => {
    return Array.from({length: sols}, (_, i) => {
      const sol = Math.max(0, selectedSol - sols + i + 1);
      return baseValue + variation * Math.sin(sol * 0.1) + (Math.random() - 0.5) * variation * 0.2;
    });
  };
  
  const batteryData = generateChartData(roverData.overlays.metrics.charge, 20);
  const tempData = generateChartData(roverData.overlays.metrics.temperature, 15);
  const radiationData = generateChartData(roverData.overlays.metrics.radiation, 0.05);
  
  return (
    <div className="carbon-app">
      {/* FUI Header */}
      <header className="carbon-header">
        <div className="header-left">
          <div className="mission-badge">
            <div className="badge-icon">◯</div>
            <div className="badge-text">
              <div className="mission-name">Mars 2020 Perseverance</div>
              <div className="mission-location">Jezero Crater • Mars</div>
            </div>
          </div>
        </div>
        
        <div className="header-center">
          <div className="status-grid">
            <div className="status-item">
              <div className="status-label">Earth Time</div>
              <div className="status-value">{new Date(roverData.header.earth_time).toISOString().slice(0, 19)}Z</div>
            </div>
            <div className="status-item">
              <div className="status-label">Mission Sol</div>
              <div className="status-value">{roverData.header.sol}</div>
            </div>
            <div className="status-item">
              <div className="status-label">System Status</div>
              <div className={`status-value status-${roverData.header.status.toLowerCase()}`}>
                <span className="status-indicator"></span>
                {roverData.header.status}
              </div>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="nasa-badge">
            <div className="nasa-text">NASA</div>
            <div className="jpl-text">JPL</div>
          </div>
        </div>
      </header>

      {/* Main Interface */}
      <div className="carbon-main">
        {/* Left Panel - Telemetry */}
        <div className="left-panel">
          <div className="panel-header">
            <h3 className="panel-title">Telemetry Data</h3>
            <div className="update-indicator">Live</div>
          </div>
          
          <div className="telemetry-grid">
            <CarbonTelemetryCard
              title="Battery Charge"
              value={roverData.overlays.metrics.charge}
              unit="%"
              trend={{
                type: roverData.overlays.metrics.charge > 70 ? 'positive' : roverData.overlays.metrics.charge > 40 ? 'neutral' : 'negative',
                icon: roverData.overlays.metrics.charge > 70 ? '↗' : roverData.overlays.metrics.charge > 40 ? '→' : '↘',
                text: roverData.overlays.metrics.charge > 70 ? 'Good' : roverData.overlays.metrics.charge > 40 ? 'Fair' : 'Low'
              }}
              data={batteryData}
              color="#0f62fe"
              icon="⚡"
            />
            
            <CarbonTelemetryCard
              title="Temperature"
              value={roverData.overlays.metrics.temperature}
              unit="°C"
              trend={{
                type: roverData.overlays.metrics.temperature > -10 ? 'positive' : roverData.overlays.metrics.temperature > -30 ? 'neutral' : 'negative',
                icon: roverData.overlays.metrics.temperature > -10 ? '↗' : roverData.overlays.metrics.temperature > -30 ? '→' : '↘',
                text: roverData.overlays.metrics.temperature > -10 ? 'Warm' : roverData.overlays.metrics.temperature > -30 ? 'Cold' : 'Freezing'
              }}
              data={tempData}
              color="#ff832b"
              icon="🌡"
            />
            
            <CarbonTelemetryCard
              title="Radiation"
              value={roverData.overlays.metrics.radiation}
              unit="μSv/h"
              trend={{
                type: roverData.overlays.metrics.radiation < 0.3 ? 'positive' : 'neutral',
                icon: roverData.overlays.metrics.radiation < 0.3 ? '→' : '↗',
                text: roverData.overlays.metrics.radiation < 0.3 ? 'Normal' : 'Elevated'
              }}
              data={radiationData}
              color="#42be65"
              icon="☢"
            />
          </div>
          
          {/* Mission Statistics */}
          <div className="mission-stats">
            <div className="stats-header">
              <h4 className="stats-title">Mission Summary</h4>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{(roverData.map.route.length * 0.05).toFixed(2)}</div>
                <div className="stat-label">km Traveled</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{Math.floor(selectedSol / 60)}</div>
                <div className="stat-label">Samples Collected</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{selectedSol}</div>
                <div className="stat-label">Sols on Mars</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{Math.floor((selectedSol * 24.6) / 24)}</div>
                <div className="stat-label">Earth Days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Mars Map */}
        <div className="center-panel">
          <div className="map-container">
            <div className="map-header">
              <div className="map-title">Surface Operations Map</div>
              <div className="map-coordinates">
                {roverData.map.current_position.lat.toFixed(5)}°N, {roverData.map.current_position.lon.toFixed(5)}°E
              </div>
            </div>
            <CarbonMarsMap 
              route={roverData.map.route}
              currentPosition={roverData.map.current_position}
              selectedSol={selectedSol}
              onLocationClick={handleLocationClick}
            />
          </div>
        </div>

        {/* Right Panel - Camera Data */}
        <div className="right-panel">
          <CarbonCameraGallery cameras={roverData.cameras} />
          
          {/* System Alerts */}
          {roverData.errors && roverData.errors.length > 0 && (
            <div className="alerts-section">
              <div className="section-header">
                <h3 className="section-title">System Alerts</h3>
              </div>
              <div className="alerts-list">
                {roverData.errors.map((error, index) => (
                  <div key={index} className="alert-item">
                    <div className="alert-icon">⚠</div>
                    <div className="alert-text">{error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Timeline */}
      <div className="timeline-container">
        <CarbonTimeline 
          sols={roverData.timeline.sols}
          selectedSol={selectedSol}
          onSolChange={handleSolChange}
        />
      </div>
    </div>
  );
}

export default App;