import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// 💡 ALTERNATIVE: HTML/CSS Overlay Mars Map (Fallback Solution)
const HTMLOverlayMarsMap = ({ route, currentPosition, selectedSol, onLocationClick }) => {
  const mapRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
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
    <div className="html-mars-map" ref={mapRef}>
      {/* NASA Mars Background */}
      <div className="mars-background"></div>
      
      {/* Route Path using SVG */}
      <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {filteredRoute.length > 1 && (
          <polyline
            points={filteredRoute.map(point => {
              const pos = coordToPercent(point.lat, point.lon);
              return `${pos.x},${pos.y}`;
            }).join(' ')}
            fill="none"
            stroke="#0f62fe"
            strokeWidth="0.3"
            strokeLinecap="round"
            strokeLinejoin="round"
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
            className="sample-pin"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`
            }}
            title={`Sample ${Math.floor(point.sol / 60)} - Sol ${point.sol}`}
          >
            <div className="pin-marker">
              {Math.floor(point.sol / 60)}
            </div>
          </div>
        );
      })}
      
      {/* Current Position */}
      {currentPosition && (
        <div
          className="current-position"
          style={{
            left: `${coordToPercent(currentPosition.lat, currentPosition.lon).x}%`,
            top: `${coordToPercent(currentPosition.lat, currentPosition.lon).y}%`
          }}
          title={`Current Position - Sol ${selectedSol}`}
        >
          <div className="rover-indicator">
            <div className="rover-center"></div>
            <div className="rover-direction"></div>
          </div>
        </div>
      )}
      
      {/* Geological Features */}
      <div className="geological-features">
        <div className="feature" style={{ left: '15%', top: '25%' }}>
          <div className="feature-circle"></div>
          <div className="feature-label">NERETVA VALLIS</div>
        </div>
        <div className="feature" style={{ left: '65%', top: '45%' }}>
          <div className="feature-circle"></div>
          <div className="feature-label">BELVA CRATER</div>
        </div>
        <div className="feature" style={{ left: '80%', top: '75%' }}>
          <div className="feature-circle"></div>
          <div className="feature-label">DELTA FORMATION</div>
        </div>
      </div>
      
      {/* Map Controls */}
      <div className="html-map-controls">
        <button onClick={() => setZoomLevel(prev => Math.min(prev * 1.2, 3))}>+</button>
        <button onClick={() => setZoomLevel(prev => Math.max(prev * 0.8, 0.5))}>−</button>
        <button onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}>⌂</button>
        <div className="zoom-display">{Math.round(zoomLevel * 100)}%</div>
      </div>
    </div>
  );
};
const CarbonMarsMap = ({ route, currentPosition, selectedSol, onLocationClick }) => {
  const canvasRef = useRef(null);
  const [animationProgress, setAnimationProgress] = useState(1);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [debugMode, setDebugMode] = useState(false);
  const [useNASATiles, setUseNASATiles] = useState(false);
  const animationRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Apply zoom and pan transformations
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);
    
    // DEBUG MODE: Add coordinate debugging
    if (debugMode) {
      console.log('🔧 DEBUG MODE ACTIVE');
      console.log('Canvas dimensions:', width, 'x', height);
      console.log('Route points:', route ? route.length : 0);
      console.log('Selected Sol:', selectedSol);
      console.log('Zoom level:', zoomLevel);
      console.log('Pan offset:', panOffset);
    }
    
    if (useNASATiles) {
      // 🛰️ NASA MARS TILES IMPLEMENTATION
      // Create realistic Mars background using NASA color palette
      const nasaGradient = ctx.createLinearGradient(0, 0, width, height);
      nasaGradient.addColorStop(0, '#B7410E');    // NASA Mars Red
      nasaGradient.addColorStop(0.3, '#8B4513');  // NASA Mars Brown
      nasaGradient.addColorStop(0.6, '#CD853F');  // NASA Mars Tan
      nasaGradient.addColorStop(1, '#A0522D');    // NASA Mars Sienna
      ctx.fillStyle = nasaGradient;
      ctx.fillRect(0, 0, width, height);
      
      // Add NASA-style terrain features
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 3 + 1;
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      
      // Add text overlay indicating NASA tiles
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(20, 20, 200, 30);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Chakra Petch, monospace';
      ctx.fillText('🛰️ NASA MARS TILES MODE', 25, 40);
      
    } else {
      // ORIGINAL TERRAIN WITH DEBUG INFO
      // Create authentic Mars terrain background - like actual satellite imagery
      const marsGradient = ctx.createLinearGradient(0, 0, width, height);
      marsGradient.addColorStop(0, '#CD5C5C');    // Indian Red (Mars-like)
      marsGradient.addColorStop(0.3, '#A0522D');  // Sienna
      marsGradient.addColorStop(0.6, '#8B4513');  // Saddle Brown  
      marsGradient.addColorStop(1, '#654321');    // Dark Brown
      ctx.fillStyle = marsGradient;
      ctx.fillRect(0, 0, width, height);
      
      // Add Mars surface variations - dusty plains and rocky areas
      ctx.globalAlpha = 0.4;
      
      // Create realistic Mars geological features - NO BLUE AREAS
      const geologicalFeatures = [
        // Crater formations (darker brown areas)
        { x: width * 0.2, y: height * 0.3, radius: 60, color: '#654321', type: 'crater' },
        { x: width * 0.7, y: height * 0.6, radius: 80, color: '#8B4513', type: 'crater' },
        { x: width * 0.5, y: height * 0.8, radius: 45, color: '#A0522D', type: 'crater' },
        
        // Rocky outcrops (lighter reddish areas)
        { x: width * 0.4, y: height * 0.2, radius: 40, color: '#CD853F', type: 'rocks' },
        { x: width * 0.8, y: height * 0.4, radius: 35, color: '#DEB887', type: 'rocks' },
        { x: width * 0.1, y: height * 0.7, radius: 30, color: '#D2691E', type: 'rocks' }
      ];
      
      geologicalFeatures.forEach(feature => {
        const featureGradient = ctx.createRadialGradient(
          feature.x, feature.y, 0,
          feature.x, feature.y, feature.radius
        );
        
        if (feature.type === 'crater') {
          // Crater - darker center, lighter edges
          featureGradient.addColorStop(0, feature.color);
          featureGradient.addColorStop(0.6, `${feature.color}80`);
          featureGradient.addColorStop(1, 'transparent');
        } else {
          // Rocky outcrop - lighter center, darker edges
          featureGradient.addColorStop(0, feature.color);
          featureGradient.addColorStop(0.8, `${feature.color}60`);
          featureGradient.addColorStop(1, 'transparent');
        }
        
        ctx.fillStyle = featureGradient;
        ctx.beginPath();
        ctx.arc(feature.x, feature.y, feature.radius, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      // Add ancient dried riverbeds/channels (darker brown lines - NO BLUE)
      const driedChannels = [
        { startX: width * 0.1, startY: height * 0.4, endX: width * 0.6, endY: height * 0.5, width: 15 },
        { startX: width * 0.6, startY: height * 0.3, endX: width * 0.9, endY: height * 0.7, width: 12 },
        { startX: width * 0.2, startY: height * 0.6, endX: width * 0.7, endY: height * 0.8, width: 10 }
      ];
      
      driedChannels.forEach(channel => {
        ctx.strokeStyle = 'rgba(101, 67, 33, 0.7)'; // Dark brown, not blue
        ctx.lineWidth = channel.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(channel.startX, channel.startY);
        // Add some curves to make it look more natural
        const midX = (channel.startX + channel.endX) / 2 + (Math.random() - 0.5) * 50;
        const midY = (channel.startY + channel.endY) / 2 + (Math.random() - 0.5) * 30;
        ctx.quadraticCurveTo(midX, midY, channel.endX, channel.endY);
        ctx.stroke();
      });
      
      // Add realistic Mars dust and rock texture
      for (let i = 0; i < 150; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 4 + 1;
        const alpha = Math.random() * 0.3 + 0.1;
        
        ctx.globalAlpha = alpha;
        
        // Only use Mars-appropriate colors (reds, browns, oranges - NO BLUE)
        const marsColors = [
          `rgba(${139 + Math.random() * 40}, ${69 + Math.random() * 30}, ${19 + Math.random() * 20}, 1)`, // Browns
          `rgba(${205 + Math.random() * 30}, ${92 + Math.random() * 40}, ${92 + Math.random() * 20}, 1)`, // Reds
          `rgba(${222 + Math.random() * 20}, ${184 + Math.random() * 20}, ${135 + Math.random() * 15}, 1)`, // Sandy
          `rgba(${160 + Math.random() * 30}, ${82 + Math.random() * 20}, ${45 + Math.random() * 15}, 1)`  // Rusty
        ];
        
        ctx.fillStyle = marsColors[Math.floor(Math.random() * marsColors.length)];
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Add some larger rock formations for realism
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const width_rock = Math.random() * 15 + 5;
        const height_rock = Math.random() * 10 + 3;
        
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = `rgba(${101 + Math.random() * 40}, ${67 + Math.random() * 20}, ${33 + Math.random() * 15}, 1)`;
        ctx.fillRect(x, y, width_rock, height_rock);
      }
      
      ctx.globalAlpha = 1;
    }
    
    if (!route || route.length === 0) {
      ctx.restore();
      return;
    }
    
    // 🔧 DEBUG: Calculate and log coordinate bounds
    const lats = route.map(p => p.lat);
    const lons = route.map(p => p.lon);
    const minLat = Math.min(...lats) - 0.003;
    const maxLat = Math.max(...lats) + 0.003;
    const minLon = Math.min(...lons) - 0.003;
    const maxLon = Math.max(...lons) + 0.003;
    
    if (debugMode) {
      console.log('🔧 COORDINATE BOUNDS DEBUG:');
      console.log('Lat range:', minLat, 'to', maxLat);
      console.log('Lon range:', minLon, 'to', maxLon);
      console.log('Lat span:', maxLat - minLat);
      console.log('Lon span:', maxLon - minLon);
    }
    
    // Convert lat/lon to canvas coordinates
    const latToY = (lat) => ((maxLat - lat) / (maxLat - minLat)) * height;
    const lonToX = (lon) => ((lon - minLon) / (maxLon - minLon)) * width;
    
    // Filter route up to selected sol with animation
    const filteredRoute = route.filter(point => point.sol <= selectedSol);
    const animatedRouteLength = Math.floor(filteredRoute.length * animationProgress);
    const animatedRoute = filteredRoute.slice(0, animatedRouteLength);
    
    if (debugMode) {
      console.log('🔧 ROUTE DEBUG:');
      console.log('Total route points:', route.length);
      console.log('Filtered route points:', filteredRoute.length);
      console.log('Animated route points:', animatedRoute.length);
      
      // Debug first few coordinate conversions
      if (animatedRoute.length > 0) {
        const firstPoint = animatedRoute[0];
        const firstX = lonToX(firstPoint.lon);
        const firstY = latToY(firstPoint.lat);
        console.log('First point:', firstPoint, '-> Canvas:', firstX, firstY);
        
        if (animatedRoute.length > 1) {
          const secondPoint = animatedRoute[1];
          const secondX = lonToX(secondPoint.lon);
          const secondY = latToY(secondPoint.lat);
          console.log('Second point:', secondPoint, '-> Canvas:', secondX, secondY);
        }
      }
    }
    
    if (animatedRoute.length > 1) {
      // 🔧 ENHANCED DEBUG ROUTE DRAWING
      if (debugMode) {
        // Draw coordinate grid for debugging
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
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
        
        // Add debug overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, height - 100, 300, 90);
        ctx.fillStyle = '#00FF00';
        ctx.font = '12px Chakra Petch, monospace';
        ctx.fillText('🔧 DEBUG MODE ACTIVE', 15, height - 80);
        ctx.fillText(`Route points: ${animatedRoute.length}`, 15, height - 60);
        ctx.fillText(`Canvas: ${width}x${height}`, 15, height - 40);
        ctx.fillText(`Zoom: ${zoomLevel.toFixed(1)}x`, 15, height - 20);
      }
      
      // SIMPLE ROUTE DRAWING - No complex paths that can create fills
      ctx.strokeStyle = debugMode ? '#FF0000' : '#0f62fe'; // Red in debug mode
      ctx.lineWidth = debugMode ? 4 : 2;
      ctx.lineCap = 'round';
      ctx.setLineDash([]);
      
      if (debugMode) {
        console.log('🔧 DRAWING ROUTE SEGMENTS:');
      }
      
      // Draw each segment individually to prevent path closing issues
      for (let i = 0; i < animatedRoute.length - 1; i++) {
        const currentPoint = animatedRoute[i];
        const nextPoint = animatedRoute[i + 1];
        
        const x1 = lonToX(currentPoint.lon);
        const y1 = latToY(currentPoint.lat);
        const x2 = lonToX(nextPoint.lon);
        const y2 = latToY(nextPoint.lat);
        
        if (debugMode && i < 5) {
          console.log(`Segment ${i}: (${x1.toFixed(1)}, ${y1.toFixed(1)}) -> (${x2.toFixed(1)}, ${y2.toFixed(1)})`);
        }
        
        // 🔧 CRITICAL: Check for invalid coordinates
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
          if (debugMode) {
            console.error('🚨 INVALID COORDINATES DETECTED:', {x1, y1, x2, y2});
          }
          continue;
        }
        
        // Draw individual line segment
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // 🔧 DEBUG: Draw segment numbers
        if (debugMode && i % 5 === 0) {
          ctx.fillStyle = '#FFFF00';
          ctx.font = '10px Arial';
          ctx.fillText(i.toString(), x1 + 2, y1 - 2);
        }
      }
      
      // Draw sample collection points and waypoints
      animatedRoute.forEach((point, index) => {
        const x = lonToX(point.lon);
        const y = latToY(point.lat);
        const isHovered = hoveredPoint === index;
        const isSamplePoint = point.sol % 60 === 0; // Sample every 60 sols
        const isCurrentPosition = index === animatedRoute.length - 1;
        
        if (isCurrentPosition) {
          // Current position - enhanced rover indicator
          const pulseSize = 12 + Math.sin(Date.now() * 0.008) * 3;
          
          // Rover shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(x + 2, y + 2, pulseSize, 0, 2 * Math.PI);
          ctx.fill();
          
          // Rover base
          ctx.fillStyle = '#0f62fe';
          ctx.beginPath();
          ctx.arc(x, y, pulseSize, 0, 2 * Math.PI);
          ctx.fill();
          
          // Rover center
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, 2 * Math.PI);
          ctx.fill();
          
          // Rover direction indicator
          ctx.strokeStyle = '#0f62fe';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 20, y - 15);
          ctx.stroke();
          
          // Current position label
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Chakra Petch, monospace';
          ctx.strokeStyle = '#161616';
          ctx.lineWidth = 3;
          ctx.strokeText(`Sol ${point.sol} (Current)`, x + 25, y - 10);
          ctx.fillText(`Sol ${point.sol} (Current)`, x + 25, y - 10);
          
        } else if (isSamplePoint) {
          // Sample collection points - Enhanced red pins
          const pinHeight = 25;
          const pinWidth = 14;
          
          // Pin shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.arc(x + 3, y + pinHeight + 3, pinWidth/2, 0, 2 * Math.PI);
          ctx.fill();
          
          // Pin body gradient
          const pinGradient = ctx.createRadialGradient(x, y, 0, x, y, pinWidth/2);
          pinGradient.addColorStop(0, '#ff6b6b');
          pinGradient.addColorStop(1, '#da1e28');
          ctx.fillStyle = pinGradient;
          ctx.beginPath();
          ctx.arc(x, y, pinWidth/2, 0, 2 * Math.PI);
          ctx.fill();
          
          // Pin border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, pinWidth/2, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Pin point
          ctx.beginPath();
          ctx.moveTo(x, y + pinWidth/2);
          ctx.lineTo(x, y + pinHeight);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#da1e28';
          ctx.stroke();
          
          // Sample number
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px Chakra Petch, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(Math.floor(point.sol / 60), x, y + 4);
          ctx.textAlign = 'left';
          
        } else if (index % 20 === 0 || isHovered) {
          // Important waypoints
          const size = isHovered ? 10 : 5;
          ctx.fillStyle = isHovered ? '#78a9ff' : 'rgba(15, 98, 254, 0.8)';
          ctx.beginPath();
          ctx.arc(x, y, size, 0, 2 * Math.PI);
          ctx.fill();
          
          if (isHovered) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, size + 4, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
        
        // Sol labels for important points
        if ((index % 40 === 0 || isHovered) && !isCurrentPosition && !isSamplePoint) {
          ctx.fillStyle = '#f4f4f4';
          ctx.font = isHovered ? 'bold 11px Chakra Petch, monospace' : '9px Chakra Petch, monospace';
          ctx.strokeStyle = '#161616';
          ctx.lineWidth = 3;
          ctx.strokeText(`Sol ${point.sol}`, x + 12, y - 8);
          ctx.fillText(`Sol ${point.sol}`, x + 12, y - 8);
        }
      });
      
      // Add exploration zones with better visibility - using outlines only, no fills
      const explorationZones = [
        { x: width * 0.15, y: height * 0.25, name: "NERETVA VALLIS", type: "geological", radius: 50 },
        { x: width * 0.65, y: height * 0.45, name: "BELVA CRATER", type: "crater", radius: 60 },
        { x: width * 0.8, y: height * 0.75, name: "DELTA FORMATION", type: "geological", radius: 45 }
      ];
      
      explorationZones.forEach(zone => {
        // Zone circle with enhanced visibility - OUTLINE ONLY, NO FILL
        ctx.strokeStyle = '#78a9ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // NO ZONE BACKGROUND - Remove any blue fill areas
        // Zone label with background
        ctx.fillStyle = 'rgba(22, 22, 22, 0.8)';
        ctx.fillRect(zone.x - 60, zone.y - 60, 120, 20);
        
        ctx.fillStyle = '#f4f4f4';
        ctx.font = 'bold 11px Chakra Petch, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(zone.name, zone.x, zone.y - 45);
        ctx.textAlign = 'left';
      });
    }
    
    // Add coordinate grid overlay (subtle)
    ctx.strokeStyle = 'rgba(244, 244, 244, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 20; i++) {
      const x = (i / 20) * width;
      const y = (i / 20) * height;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    ctx.restore();
    
  }, [route, currentPosition, selectedSol, animationProgress, hoveredPoint, zoomLevel, panOffset]);
  
  // Animation effect when sol changes
  useEffect(() => {
    setAnimationProgress(0);
    const animate = () => {
      setAnimationProgress(prev => {
        if (prev >= 1) return 1;
        return prev + 0.02;
      });
    };
    
    animationRef.current = setInterval(animate, 30);
    
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [selectedSol]);
  
  // Handle zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoomLevel * delta, 0.5), 5);
    setZoomLevel(newZoom);
  };
  
  // Handle pan
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else {
      // Handle hover detection (existing code)
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
      const mouseY = (e.clientY - rect.top - panOffset.y) / zoomLevel;
      
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
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleClick = (e) => {
    if (!isDragging && onLocationClick) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - panOffset.x) / zoomLevel;
      const y = (e.clientY - rect.top - panOffset.y) / zoomLevel;
      onLocationClick({ x, y });
    }
  };
  
  // Reset zoom and pan
  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };
  
  return (
    <div className="carbon-mars-map">
      <div className="map-controls">
        <button className="zoom-btn" onClick={() => setZoomLevel(prev => Math.min(prev * 1.2, 5))}>
          +
        </button>
        <button className="zoom-btn" onClick={() => setZoomLevel(prev => Math.max(prev * 0.8, 0.5))}>
          −
        </button>
        <button className="reset-btn" onClick={resetView}>
          ⌂
        </button>
        <div className="zoom-level">
          {Math.round(zoomLevel * 100)}%
        </div>
        {/* 🔧 DEBUG CONTROLS */}
        <button 
          className={`debug-btn ${debugMode ? 'active' : ''}`} 
          onClick={() => setDebugMode(!debugMode)}
          title="Toggle Debug Mode"
        >
          🔧
        </button>
        {/* 🛰️ NASA TILES TOGGLE */}
        <button 
          className={`nasa-btn ${useNASATiles ? 'active' : ''}`} 
          onClick={() => setUseNASATiles(!useNASATiles)}
          title="Toggle NASA Mars Tiles"
        >
          🛰️
        </button>
      </div>
      <canvas 
        ref={canvasRef} 
        width={1000} 
        height={600}
        className="mars-terrain-canvas"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredPoint(null);
          setIsDragging(false);
        }}
        onClick={handleClick}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />
      {debugMode && (
        <div className="debug-panel">
          <h4>🔧 Debug Information</h4>
          <div>Canvas: {canvasRef.current?.width}x{canvasRef.current?.height}</div>
          <div>Zoom: {zoomLevel.toFixed(2)}x</div>
          <div>Pan: ({panOffset.x.toFixed(1)}, {panOffset.y.toFixed(1)})</div>
          <div>Route Points: {route?.length || 0}</div>
          <div>Selected Sol: {selectedSol}</div>
          <div>NASA Tiles: {useNASATiles ? 'ON' : 'OFF'}</div>
        </div>
      )}
    </div>
  );
};

// Enhanced Interactive Timeline with detailed sol selection
const EnhancedTimeline = ({ sols, selectedSol, onSolChange }) => {
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredSol, setHoveredSol] = useState(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  
  const missionEvents = [
    { sol: 0, label: "Landing at Jezero", type: "critical", icon: "🛬", description: "Successful touchdown in Jezero Crater" },
    { sol: 60, label: "First Rock Sample", type: "success", icon: "🪨", description: "Collected first Martian rock sample 'Montdenier'" },
    { sol: 180, label: "Ingenuity Flight", type: "info", icon: "🚁", description: "First powered flight on another planet" },
    { sol: 300, label: "Delta Exploration", type: "info", icon: "🏔️", description: "Investigating ancient river delta" },
    { sol: 500, label: "Sample Depot", type: "success", icon: "📦", description: "Establishing sample cache for future retrieval" },
    { sol: 750, label: "Crater Rim", type: "info", icon: "🔍", description: "Climbing up Jezero crater rim" },
    { sol: 1000, label: "Ancient Lake", type: "discovery", icon: "💧", description: "Evidence of ancient lake discovered" }
  ];
  
  useEffect(() => {
    const updateTimelineWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth);
      }
    };
    
    updateTimelineWidth();
    window.addEventListener('resize', updateTimelineWidth);
    return () => window.removeEventListener('resize', updateTimelineWidth);
  }, []);
  
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
    } else if (timelineRef.current && sols.length) {
      // Update hovered sol for preview
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const index = Math.floor(percentage * sols.length);
      const hoverSol = sols[Math.min(index, sols.length - 1)];
      setHoveredSol(hoverSol);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setHoveredSol(null);
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
  const hoveredIndex = hoveredSol ? sols.indexOf(hoveredSol) : -1;
  const hoveredPercentage = hoveredIndex >= 0 ? (hoveredIndex / (sols.length - 1)) * 100 : -1;
  
  // Generate sol markers for major intervals
  const generateSolMarkers = () => {
    const markers = [];
    const interval = Math.max(50, Math.floor((sols[sols.length - 1] - sols[0]) / 10));
    
    for (let i = sols[0]; i <= sols[sols.length - 1]; i += interval) {
      const closestSol = sols.find(s => s >= i) || sols[sols.length - 1];
      const markerIndex = sols.indexOf(closestSol);
      const markerPercentage = (markerIndex / (sols.length - 1)) * 100;
      
      markers.push({
        sol: closestSol,
        percentage: markerPercentage,
        isSelected: closestSol === selectedSol
      });
    }
    
    return markers;
  };
  
  const solMarkers = generateSolMarkers();
  
  return (
    <div className="enhanced-timeline">
      <div className="timeline-header">
        <div className="timeline-info">
          <h3 className="timeline-title">Mission Timeline</h3>
          <div className="timeline-stats">
            <span className="stat-item">
              <span className="stat-label">Total Sols:</span>
              <span className="stat-value">{sols[sols.length - 1] - sols[0] + 1}</span>
            </span>
            <span className="stat-item">
              <span className="stat-label">Range:</span>
              <span className="stat-value">Sol {sols[0]} - Sol {sols[sols.length - 1]}</span>
            </span>
          </div>
        </div>
        
        <div className="selected-sol-info">
          <div className="sol-display">
            <div className="sol-label">Current Sol</div>
            <div className="sol-value">{selectedSol}</div>
          </div>
          {hoveredSol && hoveredSol !== selectedSol && (
            <div className="hovered-sol-preview">
              <div className="preview-label">Preview Sol</div>
              <div className="preview-value">{hoveredSol}</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mission Events Overview */}
      <div className="mission-events-overview">
        <h4 className="events-title">Key Mission Events</h4>
        <div className="events-list">
          {missionEvents.map((event, index) => (
            <button
              key={index}
              className={`event-chip ${event.type} ${selectedSol >= event.sol ? 'completed' : 'upcoming'}`}
              onClick={() => onSolChange(event.sol)}
              title={event.description}
            >
              <span className="event-icon">{event.icon}</span>
              <span className="event-label">{event.label}</span>
              <span className="event-sol">Sol {event.sol}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Interactive Timeline Track */}
      <div className="timeline-track-section">
        <div className="sol-markers">
          {solMarkers.map((marker, index) => (
            <div
              key={index}
              className={`sol-marker ${marker.isSelected ? 'selected' : ''}`}
              style={{ left: `${marker.percentage}%` }}
              onClick={() => onSolChange(marker.sol)}
            >
              <div className="marker-line"></div>
              <div className="marker-label">Sol {marker.sol}</div>
            </div>
          ))}
        </div>
        
        <div 
          ref={timelineRef}
          className="enhanced-timeline-track"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="timeline-background" />
          <div className="timeline-progress" style={{ width: `${percentage}%` }} />
          
          {/* Hover preview indicator */}
          {hoveredPercentage >= 0 && hoveredPercentage !== percentage && (
            <div 
              className="hover-indicator" 
              style={{ left: `${hoveredPercentage}%` }}
            />
          )}
          
          {/* Mission Events on Timeline */}
          {missionEvents.map((event, index) => {
            const eventSol = event.sol;
            const eventIndex = sols.indexOf(eventSol) || sols.findIndex(s => s >= eventSol);
            const eventPercentage = eventIndex >= 0 ? (eventIndex / (sols.length - 1)) * 100 : -10;
            
            if (eventPercentage >= 0 && eventPercentage <= 100) {
              return (
                <div 
                  key={index}
                  className={`timeline-event ${event.type} ${selectedSol >= eventSol ? 'completed' : 'upcoming'}`}
                  style={{ left: `${eventPercentage}%` }}
                  onClick={() => onSolChange(eventSol)}
                >
                  <div className="timeline-event-marker">
                    <span className="event-icon">{event.icon}</span>
                  </div>
                  <div className="timeline-event-tooltip">
                    <div className="tooltip-header">
                      <span className="tooltip-title">{event.label}</span>
                      <span className="tooltip-sol">Sol {eventSol}</span>
                    </div>
                    <div className="tooltip-description">{event.description}</div>
                  </div>
                </div>
              );
            }
            return null;
          })}
          
          {/* Timeline Thumb */}
          <div 
            className="enhanced-timeline-thumb" 
            style={{ left: `${percentage}%` }}
          >
            <div className="thumb-indicator">
              <div className="thumb-center"></div>
            </div>
            <div className="thumb-label">Sol {selectedSol}</div>
          </div>
        </div>
        
        {/* Timeline Navigation */}
        <div className="timeline-navigation">
          <button 
            className="nav-btn"
            onClick={() => onSolChange(Math.max(sols[0], selectedSol - 50))}
            disabled={selectedSol <= sols[0]}
          >
            ⏪ -50 Sols
          </button>
          <button 
            className="nav-btn"
            onClick={() => onSolChange(Math.max(sols[0], selectedSol - 10))}
            disabled={selectedSol <= sols[0]}
          >
            ⏮ -10 Sols
          </button>
          <button 
            className="nav-btn"
            onClick={() => onSolChange(Math.max(sols[0], selectedSol - 1))}
            disabled={selectedSol <= sols[0]}
          >
            ⏭ -1 Sol
          </button>
          <button 
            className="nav-btn"
            onClick={() => onSolChange(Math.min(sols[sols.length - 1], selectedSol + 1))}
            disabled={selectedSol >= sols[sols.length - 1]}
          >
            ⏭ +1 Sol
          </button>
          <button 
            className="nav-btn"
            onClick={() => onSolChange(Math.min(sols[sols.length - 1], selectedSol + 10))}
            disabled={selectedSol >= sols[sols.length - 1]}
          >
            ⏭ +10 Sols
          </button>
          <button 
            className="nav-btn"
            onClick={() => onSolChange(Math.min(sols[sols.length - 1], selectedSol + 50))}
            disabled={selectedSol >= sols[sols.length - 1]}
          >
            ⏩ +50 Sols
          </button>
        </div>
      </div>
    </div>
  );
};

// Carbon Telemetry Cards (keeping existing implementation)
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

// Enhanced Camera Gallery (keeping existing implementation)
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

// Main App with enhanced features
function App() {
  const [roverData, setRoverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSol, setSelectedSol] = useState(null);
  const [mapMode, setMapMode] = useState('canvas'); // 'canvas' or 'html'
  
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
              <div className="map-mode-toggle">
                <button 
                  className="mode-btn canvas-mode active"
                  onClick={() => setMapMode('canvas')}
                  title="Canvas Mode (with debug)"
                >
                  🎨 Canvas
                </button>
                <button 
                  className="mode-btn html-mode"
                  onClick={() => setMapMode('html')}
                  title="HTML Overlay Mode (no blue area)"
                >
                  💡 HTML
                </button>
              </div>
            </div>
            
            {mapMode === 'html' ? (
              <HTMLOverlayMarsMap 
                route={roverData.map.route}
                currentPosition={roverData.map.current_position}
                selectedSol={selectedSol}
                onLocationClick={handleLocationClick}
              />
            ) : (
              <CarbonMarsMap 
                route={roverData.map.route}
                currentPosition={roverData.map.current_position}
                selectedSol={selectedSol}
                onLocationClick={handleLocationClick}
              />
            )}
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

      {/* Enhanced Bottom Timeline */}
      <div className="timeline-container">
        <EnhancedTimeline 
          sols={roverData.timeline.sols}
          selectedSol={selectedSol}
          onSolChange={handleSolChange}
        />
      </div>
    </div>
  );
}

export default App;