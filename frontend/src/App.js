import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Real-time data cache and update system
const DataCache = {
  cache: new Map(),
  lastUpdate: null,
  UPDATE_INTERVAL: 300000, // 5 minutes
  
  get(key) {
    return this.cache.get(key);
  },
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },
  
  isStale(key) {
    const cached = this.cache.get(key);
    if (!cached) return true;
    return Date.now() - cached.timestamp > this.UPDATE_INTERVAL;
  }
};

// Enhanced NASA Mars Map with Real Route Data and Zoom
const NASAMarsMap = ({ route, currentPosition, selectedSol, onLocationClick, zoomLevel = 1 }) => {
  const mapRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Memoized coordinate calculations for performance
  const routeBounds = React.useMemo(() => {
    if (!route || route.length === 0) return null;
    
    const lats = route.map(p => p.lat);
    const lons = route.map(p => p.lon);
    return {
      minLat: Math.min(...lats) - 0.002,
      maxLat: Math.max(...lats) + 0.002,
      minLon: Math.min(...lons) - 0.002,
      maxLon: Math.max(...lons) + 0.002
    };
  }, [route]);
  
  // Optimized coordinate conversion
  const coordToPercent = useCallback((lat, lon) => {
    if (!routeBounds) return { x: 50, y: 50 };
    
    const x = ((lon - routeBounds.minLon) / (routeBounds.maxLon - routeBounds.minLon)) * 100;
    const y = ((routeBounds.maxLat - lat) / (routeBounds.maxLat - routeBounds.minLat)) * 100;
    
    return { 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    };
  }, [routeBounds]);
  
  // Virtualized route rendering for performance
  const visibleRoute = React.useMemo(() => {
    if (!route) return [];
    return route.filter(point => point.sol <= selectedSol);
  }, [route, selectedSol]);
  
  return (
    <div className="nasa-mars-map" ref={mapRef}>
      {isLoading && <div className="map-loading">Updating Mars data...</div>}
      
      {/* High-resolution Mars satellite background */}
      <div className="mars-satellite-background" style={{ transform: `scale(${zoomLevel})` }}></div>
      
      {/* Exploration Zone Circle */}
      <div className="exploration-zone" style={{ transform: `scale(${zoomLevel})` }}></div>
      
      {/* Optimized Route Path using SVG */}
      <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ transform: `scale(${zoomLevel})` }}>
        {visibleRoute.length > 1 && (
          <polyline
            points={visibleRoute.map(point => {
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
      
      {/* Sample Collection Points - Virtualized */}
      {visibleRoute.filter((point, index) => point.sol % 60 === 0).map((point, index) => {
        const pos = coordToPercent(point.lat, point.lon);
        return (
          <div
            key={`sample-${point.sol}`}
            className="nasa-sample-pin"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `scale(${zoomLevel})`
            }}
            title={`Sample ${Math.floor(point.sol / 60)} - Sol ${point.sol}`}
          >
            <div className="nasa-pin-marker">
              {Math.floor(point.sol / 60)}
            </div>
          </div>
        );
      })}
      
      {/* Rover Positions - Optimized rendering */}
      {visibleRoute.filter((_, index) => index % 50 === 0).map((point, index) => {
        const pos = coordToPercent(point.lat, point.lon);
        const isCurrentPosition = point.sol >= selectedSol - 5 && point.sol <= selectedSol;
        
        return (
          <div
            key={`rover-${point.sol}`}
            className={`nasa-rover-position ${isCurrentPosition ? 'current' : ''}`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `scale(${zoomLevel})`
            }}
            title={`Rover Position - Sol ${point.sol}`}
          >
            <div className="rover-diamond">
              {isCurrentPosition && <div className="rover-pulse"></div>}
            </div>
          </div>
        );
      })}

    </div>
  );
};

// Enhanced Telemetry Card with Real-time Updates
const NASATelemetryCard = ({ title, value, unit, data, color, type, subtitle, isLive = false }) => {
  const chartRef = useRef(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  useEffect(() => {
    if (!chartRef.current || !data) return;
    
    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Performance: Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      ctx.clearRect(0, 0, width, height);
      
      if (type === 'line') {
        // Optimized line chart rendering
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
        
        // Fill area with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `${color}40`);
        gradient.addColorStop(1, `${color}10`);
        
        ctx.fillStyle = gradient;
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        
      } else if (type === 'bar') {
        // Optimized bar chart rendering
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
    });
    
    if (isLive) {
      setLastUpdate(Date.now());
    }
  }, [data, color, type, value, isLive]);
  
  return (
    <div className="nasa-telemetry-card">
      <div className="card-header">
        <div className={`card-icon ${isLive ? 'live' : ''}`}>●</div>
        <div className="card-info">
          <div className="card-title">{title}</div>
          {subtitle && <div className="card-subtitle">{subtitle}</div>}
        </div>
        {isLive && (
          <div className="live-timestamp">
            {new Date(lastUpdate).toLocaleTimeString()}
          </div>
        )}
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

// Skeleton Loader Components
const SkeletonLoader = ({ width = "100%", height = "20px", className = "" }) => (
  <div className={`skeleton-loader ${className}`} style={{ width, height }}>
    <div className="skeleton-shimmer"></div>
  </div>
);

const TelemetryCardSkeleton = () => (
  <div className="nasa-telemetry-card skeleton-card">
    <div className="card-header">
      <SkeletonLoader width="8px" height="8px" className="skeleton-circle" />
      <div className="card-info">
        <SkeletonLoader width="80px" height="12px" />
        <SkeletonLoader width="120px" height="10px" />
      </div>
    </div>
    <div className="card-main-value">
      <SkeletonLoader width="60px" height="24px" />
      <SkeletonLoader width="30px" height="12px" />
    </div>
    <div className="card-chart">
      <SkeletonLoader width="150px" height="45px" />
    </div>
    <div className="card-stats">
      <SkeletonLoader width="30px" height="20px" />
      <SkeletonLoader width="30px" height="20px" />
      <SkeletonLoader width="30px" height="20px" />
    </div>
  </div>
);

const MapSkeleton = () => (
  <div className="map-skeleton">
    <SkeletonLoader width="100%" height="100%" />
    <div className="skeleton-overlay">
      <SkeletonLoader width="200px" height="16px" className="map-title-skeleton" />
      <SkeletonLoader width="300px" height="12px" className="map-coords-skeleton" />
    </div>
  </div>
);

const ImageSkeleton = () => (
  <div className="nasa-camera-image-enhanced skeleton-image">
    <SkeletonLoader width="100%" height="100%" />
  </div>
);

// Real-time Notifications System
const NASANotifications = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;
  
  return (
    <div className="nasa-notifications">
      {notifications.map((notification, index) => (
        <div key={index} className={`nasa-notification ${notification.type}`}>
          <div className="notification-icon">
            {notification.type === 'discovery' ? '🚀' : notification.type === 'sample' ? '🧪' : '📡'}
          </div>
          <div className="notification-content">
            <div className="notification-title">{notification.title}</div>
            <div className="notification-message">{notification.message}</div>
            <div className="notification-time">SOL {notification.sol}</div>
          </div>
          <button className="notification-close" onClick={() => onDismiss(index)}>×</button>
        </div>
      ))}
    </div>
  );
};

// Enhanced NASA Camera Gallery with Modal and Advanced Features
const NASACameraGallery = ({ cameras }) => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [modalImage, setModalImage] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Lazy load images for performance
  const handleImageLoad = useCallback((imageIndex) => {
    setLoadedImages(prev => new Set([...prev, imageIndex]));
  }, []);
  
  // Enhanced camera categorization
  const categorizeCamera = (cameraName) => {
    const name = cameraName.toLowerCase();
    if (name.includes('front') || name.includes('fhaz')) return 'front';
    if (name.includes('rear') || name.includes('rhaz') || name.includes('back')) return 'rear';
    if (name.includes('nav') || name.includes('navigation')) return 'navigation';
    if (name.includes('mast') || name.includes('mastcam')) return 'mast';
    if (name.includes('mahli') || name.includes('hand')) return 'hand';
    if (name.includes('mardi') || name.includes('descent')) return 'descent';
    if (name.includes('chemcam') || name.includes('supercam')) return 'science';
    return 'other';
  };
  
  // Get all images with metadata
  const getAllImagesWithMetadata = useCallback(() => {
    if (!cameras || cameras.length === 0) return [];
    
    return cameras.flatMap(camera => 
      camera.images.map(image => ({
        ...image,
        cameraName: camera.name,
        category: categorizeCamera(camera.name),
        metadata: {
          timestamp: image.timestamp || new Date().toISOString(),
          location: image.location || { lat: 18.4447, lon: 77.4508 },
          sol: image.sol || 1000,
          localTime: image.local_time || '15:30:45',
          cameraType: camera.name
        }
      }))
    );
  }, [cameras]);
  
  // Filter images based on selected tab
  const filteredImages = React.useMemo(() => {
    const allImages = getAllImagesWithMetadata();
    if (selectedTab === 'all') return allImages;
    return allImages.filter(img => img.category === selectedTab);
  }, [getAllImagesWithMetadata, selectedTab]);
  
  // Tab configuration
  const tabs = React.useMemo(() => {
    const allImages = getAllImagesWithMetadata();
    const tabCounts = allImages.reduce((acc, img) => {
      acc[img.category] = (acc[img.category] || 0) + 1;
      return acc;
    }, {});
    
    return [
      { key: 'all', label: 'ALL CAMERAS', count: allImages.length },
      { key: 'front', label: 'FRONT HAZARD', count: tabCounts.front || 0 },
      { key: 'rear', label: 'REAR HAZARD', count: tabCounts.rear || 0 },
      { key: 'navigation', label: 'NAVIGATION', count: tabCounts.navigation || 0 },
      { key: 'mast', label: 'MAST CAMERAS', count: tabCounts.mast || 0 },
      { key: 'science', label: 'SCIENCE', count: tabCounts.science || 0 },
      { key: 'hand', label: 'ARM CAMERAS', count: tabCounts.hand || 0 }
    ].filter(tab => tab.count > 0);
  }, [getAllImagesWithMetadata]);
  
  // Handle image click to open modal
  const handleImageClick = useCallback((image) => {
    setModalImage(image);
    setModalOpen(true);
  }, []);
  
  // Handle image download
  const handleDownload = useCallback(async (image) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mars-rover-${image.metadata.sol}-${image.cameraName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(image.url, '_blank');
    }
  }, []);
  
  // Handle modal close
  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setModalImage(null);
  }, []);
  
  // Handle keyboard navigation in modal
  const handleKeyDown = useCallback((e) => {
    if (!modalOpen) return;
    
    if (e.key === 'Escape') {
      handleModalClose();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const currentIndex = filteredImages.findIndex(img => img.url === modalImage?.url);
      let nextIndex;
      
      if (e.key === 'ArrowLeft') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : filteredImages.length - 1;
      } else {
        nextIndex = currentIndex < filteredImages.length - 1 ? currentIndex + 1 : 0;
      }
      
      setModalImage(filteredImages[nextIndex]);
    }
  }, [modalOpen, modalImage, filteredImages, handleModalClose]);
  
  // Add keyboard event listener
  React.useEffect(() => {
    if (modalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [modalOpen, handleKeyDown]);
  
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
  
  return (
    <div className="nasa-camera-section">
      <div className="section-header">
        <h3>CAMERA SYSTEMS</h3>
        <div className="image-count">{filteredImages.length} Images</div>
      </div>
      
      {/* Enhanced Tab Navigation */}
      <div className="camera-tabs-enhanced">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`nasa-camera-tab-enhanced ${selectedTab === tab.key ? 'active' : ''}`}
            onClick={() => setSelectedTab(tab.key)}
          >
            <div className="tab-label">{tab.label}</div>
            <div className="tab-count">{tab.count}</div>
          </button>
        ))}
      </div>
      
      {/* Image Grid */}
      <div className="nasa-camera-grid-enhanced">
        {filteredImages.slice(0, 12).map((image, index) => (
          <div 
            key={`${image.url}-${index}`} 
            className="nasa-camera-image-enhanced"
            onClick={() => handleImageClick(image)}
          >
            <img 
              src={image.url} 
              alt={`${image.cameraName} ${index + 1}`}
              loading="lazy"
              onLoad={() => handleImageLoad(index)}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5PIElNQUdFPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
            {!loadedImages.has(index) && (
              <div className="image-loader">Loading...</div>
            )}
            <div className="image-overlay">
              <div className="image-info">
                <div className="camera-name">{image.cameraName}</div>
                <div className="image-sol">SOL {image.metadata.sol}</div>
              </div>
              <div className="image-actions">
                <button 
                  className="action-btn view-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageClick(image);
                  }}
                >
                  🔍
                </button>
                <button 
                  className="action-btn download-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(image);
                  }}
                >
                  ⬇
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Enhanced Image Modal */}
      {modalOpen && modalImage && (
        <div className="nasa-image-modal" onClick={handleModalClose}>
          <div className="modal-overlay"></div>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <h3>{modalImage.cameraName}</h3>
                <div className="modal-subtitle">SOL {modalImage.metadata.sol} • {modalImage.metadata.localTime}</div>
              </div>
              <button className="modal-close" onClick={handleModalClose}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="modal-image-container">
                <img 
                  src={modalImage.url} 
                  alt={modalImage.cameraName}
                  className="modal-image"
                />
                <div className="modal-navigation">
                  <button 
                    className="nav-btn prev-btn"
                    onClick={() => {
                      const currentIndex = filteredImages.findIndex(img => img.url === modalImage.url);
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredImages.length - 1;
                      setModalImage(filteredImages[prevIndex]);
                    }}
                  >
                    ‹
                  </button>
                  <button 
                    className="nav-btn next-btn"
                    onClick={() => {
                      const currentIndex = filteredImages.findIndex(img => img.url === modalImage.url);
                      const nextIndex = currentIndex < filteredImages.length - 1 ? currentIndex + 1 : 0;
                      setModalImage(filteredImages[nextIndex]);
                    }}
                  >
                    ›
                  </button>
                </div>
              </div>
              
              <div className="modal-metadata">
                <div className="metadata-section">
                  <h4>IMAGE METADATA</h4>
                  <div className="metadata-grid">
                    <div className="metadata-item">
                      <span className="metadata-label">TIMESTAMP</span>
                      <span className="metadata-value">{new Date(modalImage.metadata.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">SOL</span>
                      <span className="metadata-value">{modalImage.metadata.sol}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">LOCAL TIME</span>
                      <span className="metadata-value">{modalImage.metadata.localTime}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">LOCATION</span>
                      <span className="metadata-value">
                        {modalImage.metadata.location.lat.toFixed(4)}°N, {modalImage.metadata.location.lon.toFixed(4)}°E
                      </span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">CAMERA TYPE</span>
                      <span className="metadata-value">{modalImage.metadata.cameraType}</span>
                    </div>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="modal-action-btn download-action"
                    onClick={() => handleDownload(modalImage)}
                  >
                    ⬇ DOWNLOAD IMAGE
                  </button>
                  <button 
                    className="modal-action-btn view-original"
                    onClick={() => window.open(modalImage.url, '_blank')}
                  >
                    🔗 VIEW ORIGINAL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ADVANCED MISSION TIMELINE - The centerpiece
const AdvancedMissionTimeline = ({ sols, selectedSol, onSolChange }) => {
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [timelineMode, setTimelineMode] = useState('events'); // 'events', 'detailed', 'analytics'
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const autoPlayRef = useRef(null);
  
  // Comprehensive mission events with categories and details
  const comprehensiveMissionEvents = [
    {
      sol: 0, 
      label: "LANDING AT JEZERO", 
      shortLabel: "LANDING", 
      type: "critical",
      category: "landing",
      description: "Successful touchdown in Jezero Crater using sky crane maneuver",
      significance: "Mission start",
      instruments: ["Cameras", "MOXIE"],
      coordinates: { lat: 18.4447, lon: 77.4508 }
    },
    {
      sol: 18,
      label: "FIRST DRIVE",
      shortLabel: "FIRST DRIVE", 
      type: "milestone",
      category: "mobility",
      description: "Perseverance's first drive on Mars - 6.5 meters forward",
      significance: "Mobility systems operational",
      instruments: ["Navigation Cameras", "Hazcams"],
      coordinates: { lat: 18.4448, lon: 77.4509 }
    },
    {
      sol: 43,
      label: "INGENUITY DEPLOYED",
      shortLabel: "HELI DEPLOYED",
      type: "milestone", 
      category: "helicopter",
      description: "Mars Helicopter Ingenuity successfully deployed from rover belly",
      significance: "First Mars helicopter preparation",
      instruments: ["Ingenuity"],
      coordinates: { lat: 18.4446, lon: 77.4505 }
    },
    {
      sol: 60,
      label: "FIRST ROCK SAMPLE",
      shortLabel: "FIRST SAMPLE",
      type: "success",
      category: "sampling",
      description: "Successfully collected first rock sample 'Montdenier'",
      significance: "Primary mission objective achieved",
      instruments: ["Sampling and Caching System", "SUPERCAM"],
      coordinates: { lat: 18.4455, lon: 77.4520 }
    },
    {
      sol: 62,
      label: "INGENUITY FIRST FLIGHT",
      shortLabel: "FIRST FLIGHT",
      type: "historic",
      category: "helicopter", 
      description: "First powered flight on another planet - 39.1 seconds",
      significance: "Historic aviation achievement",
      instruments: ["Ingenuity Helicopter"],
      coordinates: { lat: 18.4446, lon: 77.4505 }
    },
    {
      sol: 120,
      label: "OCTAVIA E. BUTLER SITE",
      shortLabel: "BUTLER SITE",
      type: "exploration",
      category: "exploration",
      description: "Reached Octavia E. Butler landing site for detailed exploration",
      significance: "Geological survey location",
      instruments: ["RIMFAX", "SUPERCAM", "MASTCAM-Z"],
      coordinates: { lat: 18.4455, lon: 77.4515 }
    },
    {
      sol: 180,
      label: "MULTIPLE HELICOPTER FLIGHTS", 
      shortLabel: "MULTI FLIGHTS",
      type: "success",
      category: "helicopter",
      description: "Series of successful helicopter flights scouting ahead",
      significance: "Extended helicopter operations",
      instruments: ["Ingenuity"],
      coordinates: { lat: 18.4460, lon: 77.4525 }
    },
    {
      sol: 234,
      label: "SAMPLE CACHE CREATED",
      shortLabel: "CACHE START",
      type: "success", 
      category: "sampling",
      description: "Started creating sample cache for future Mars Sample Return",
      significance: "Future mission preparation",
      instruments: ["Sampling System"],
      coordinates: { lat: 18.4465, lon: 77.4530 }
    },
    {
      sol: 300,
      label: "DELTA EXPLORATION",
      shortLabel: "DELTA EXPL",
      type: "exploration",
      category: "exploration", 
      description: "Began exploration of ancient river delta formation",
      significance: "Search for signs of ancient life",
      instruments: ["SUPERCAM", "PIXL", "SHERLOC"],
      coordinates: { lat: 18.4480, lon: 77.4550 }
    },
    {
      sol: 500,
      label: "SAMPLE DEPOT COMPLETE",
      shortLabel: "DEPOT DONE",
      type: "success",
      category: "sampling",
      description: "Completed sample depot with 10 tubes for future retrieval",
      significance: "Mars Sample Return preparation complete",
      instruments: ["Sampling System"],
      coordinates: { lat: 18.4500, lon: 77.4580 }
    },
    {
      sol: 750,
      label: "CRATER RIM ASCENT",
      shortLabel: "RIM CLIMB",
      type: "milestone",
      category: "mobility",
      description: "Successfully climbed up Jezero crater rim",
      significance: "New geological terrain access",
      instruments: ["All systems"],
      coordinates: { lat: 18.4520, lon: 77.4600 }
    },
    {
      sol: 1000,
      label: "ANCIENT LAKE EVIDENCE",
      shortLabel: "ANCIENT LAKE", 
      type: "discovery",
      category: "discovery",
      description: "Discovered compelling evidence of ancient lake in Jezero Crater",
      significance: "Major scientific discovery",
      instruments: ["SUPERCAM", "MASTCAM-Z", "RIMFAX"],
      coordinates: { lat: 18.4540, lon: 77.4620 }
    }
  ];
  
  // Filter events based on search and filter type
  const filteredEvents = React.useMemo(() => {
    let events = comprehensiveMissionEvents;
    
    if (filterType !== 'all') {
      events = events.filter(event => event.category === filterType);
    }
    
    if (searchQuery) {
      events = events.filter(event => 
        event.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return events;
  }, [searchQuery, filterType]);
  
  // Enhanced Auto-play functionality - from SOL 1 to current
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) return;
    
    setIsAutoPlay(true);
    // Start from SOL 1 and go through all events up to current SOL
    const eventsToPlay = filteredEvents.filter(event => event.sol >= 0 && event.sol <= 1000);
    let currentIndex = 0;
    
    // Start from SOL 1
    onSolChange(1);
    
    const playNext = () => {
      if (currentIndex < eventsToPlay.length) {
        onSolChange(eventsToPlay[currentIndex].sol);
        currentIndex++;
        // Speed-controlled animation timing
        autoPlayRef.current = setTimeout(playNext, 2000 / playbackSpeed);
      } else {
        // End at current SOL (1000)
        onSolChange(1000);
        setIsAutoPlay(false);
        autoPlayRef.current = null;
      }
    };
    
    // Start the sequence after initial delay
    autoPlayRef.current = setTimeout(playNext, 1000 / playbackSpeed);
  }, [filteredEvents, onSolChange, playbackSpeed]);
  
  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    setIsAutoPlay(false);
  }, []);
  
  // Timeline interaction handlers
  const handleInteraction = useCallback((e) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const maxSol = 1000; // Fixed max sol for consistent positioning
    const newSol = Math.round(percentage * maxSol);
    
    if (newSol !== selectedSol) {
      onSolChange(newSol);
    }
  }, [selectedSol, onSolChange]);
  
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      handleInteraction(e);
    }
  }, [isDragging, handleInteraction]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    handleInteraction(e);
    stopAutoPlay(); // Stop auto-play when user interacts
  }, [handleInteraction, stopAutoPlay]);
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Cleanup auto-play on unmount
  useEffect(() => {
    return () => {
      if (autoPlayRef.current) {
        clearTimeout(autoPlayRef.current);
      }
    };
  }, []);
  
  const maxSol = 1000; // Fixed max sol for consistent positioning
  const percentage = (selectedSol / maxSol) * 100;
  
  return (
    <div className="advanced-mission-timeline">
      {/* Timeline Controls */}
      <div className="timeline-controls">
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
        
        {/* Advanced Controls */}
        <div className="timeline-advanced-controls">
          {/* Mode Selection */}
          <div className="mode-selector">
            <button 
              className={`mode-btn ${timelineMode === 'events' ? 'active' : ''}`}
              onClick={() => setTimelineMode('events')}
            >
              EVENTS
            </button>
            <button 
              className={`mode-btn ${timelineMode === 'detailed' ? 'active' : ''}`}
              onClick={() => setTimelineMode('detailed')}
            >
              DETAILED
            </button>
          </div>
          
          {/* Search and Filter */}
          <div className="search-filter-controls">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="timeline-search"
            />
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="timeline-filter"
            >
              <option value="all">All Events</option>
              <option value="landing">Landing</option>
              <option value="sampling">Sampling</option>
              <option value="helicopter">Helicopter</option>
              <option value="exploration">Exploration</option>
              <option value="discovery">Discoveries</option>
              <option value="mobility">Mobility</option>
            </select>
          </div>
          
          {/* Auto-play Controls */}
          <div className="autoplay-controls">
            {!isAutoPlay ? (
              <button className="autoplay-btn" onClick={startAutoPlay}>
                ▶ AUTO PLAY
              </button>
            ) : (
              <button className="autoplay-btn active" onClick={stopAutoPlay}>
                ⏸ PAUSE
              </button>
            )}
            <select 
              value={playbackSpeed} 
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="speed-selector"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Timeline Track */}
      <div className="timeline-track-container">
        <div 
          ref={timelineRef}
          className="nasa-timeline-track"
          onMouseDown={handleMouseDown}
        >
          <div className="timeline-background" />
          <div className="timeline-progress" style={{ width: `${percentage}%` }} />
          
          {/* Mission Events */}
          {filteredEvents.map((event, index) => {
            const eventSol = event.sol;
            const maxSol = 1000; // Fixed max sol for consistent positioning
            const eventPercentage = (eventSol / maxSol) * 100;
            
            // Show all events on the timeline regardless of sols array
            return (
              <div 
                key={index}
                className={`nasa-timeline-event ${event.type} ${selectedSol >= eventSol ? 'completed' : 'upcoming'} ${timelineMode}`}
                style={{ left: `${Math.min(eventPercentage, 95)}%` }}
                onClick={() => onSolChange(eventSol)}
              >
                <div className="event-marker">
                  <div className="event-dot"></div>
                </div>
                <div className="event-label">
                  <div className="event-title">{event.shortLabel}</div>
                  <div className="event-sol">SOL {eventSol}</div>
                  {timelineMode === 'detailed' && (
                    <div className="event-details">
                      <div className="event-description">{event.description}</div>
                      <div className="event-instruments">
                        {event.instruments.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          <div 
            className="nasa-timeline-thumb" 
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
      
      {/* Enhanced Navigation */}
      <div className="timeline-navigation">
        <button onClick={() => onSolChange(Math.max(0, selectedSol - 100))} disabled={selectedSol <= 0}>
          ⏪ -100 SOLS
        </button>
        <button onClick={() => onSolChange(Math.max(0, selectedSol - 30))} disabled={selectedSol <= 0}>
          ⏪ -30 SOLS
        </button>
        <button onClick={() => onSolChange(Math.max(0, selectedSol - 10))} disabled={selectedSol <= 0}>
          ⏮ -10 SOLS
        </button>
        <button onClick={() => onSolChange(Math.max(0, selectedSol - 5))} disabled={selectedSol <= 0}>
          ⏮ -5 SOLS
        </button>
        <button className="home-btn" onClick={() => onSolChange(1000)}>
          ⌂ CURRENT
        </button>
        <button onClick={() => onSolChange(Math.min(1000, selectedSol + 5))} disabled={selectedSol >= 1000}>
          ⏭ +5 SOLS
        </button>
        <button onClick={() => onSolChange(Math.min(1000, selectedSol + 10))} disabled={selectedSol >= 1000}>
          ⏭ +10 SOLS
        </button>
        <button onClick={() => onSolChange(Math.min(1000, selectedSol + 30))} disabled={selectedSol >= 1000}>
          +30 SOLS ⏩
        </button>
        <button onClick={() => onSolChange(Math.min(1000, selectedSol + 100))} disabled={selectedSol >= 1000}>
          +100 SOLS ⏩
        </button>
      </div>

    </div>
  );
};

// Main App with Real-time Updates
function App() {
  const [roverData, setRoverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSol, setSelectedSol] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [telemetryMode, setTelemetryMode] = useState('vertical'); // 'vertical' or 'horizontal'
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [telemetryGroup, setTelemetryGroup] = useState('all'); // 'all', 'environmental', 'systems', 'atmospheric'
  const [mapZoomLevel, setMapZoomLevel] = useState(1);
  const [mapZoomMemory, setMapZoomMemory] = useState({});
  
  // Real-time data fetching with caching
  const fetchRoverData = useCallback(async (sol = null, forceRefresh = false) => {
    try {
      setLoading(true);
      const cacheKey = `rover-data-${sol || 'latest'}`;
      
      // Check cache first (unless force refresh)
      if (!forceRefresh && !DataCache.isStale(cacheKey)) {
        const cached = DataCache.get(cacheKey);
        if (cached) {
          setRoverData(cached.data);
          setSelectedSol(cached.data.header.sol);
          setError(null);
          setLoading(false);
          return;
        }
      }
      
      const endpoint = sol ? `/rover-data/${sol}` : '/rover-data';
      const response = await axios.get(`${API}${endpoint}`);
      
      // Cache the response
      DataCache.set(cacheKey, response.data);
      
      setRoverData(response.data);
      setSelectedSol(response.data.header.sol);
      setError(null);
      setLastUpdateTime(new Date());
    } catch (err) {
      console.error('Error fetching rover data:', err);
      setError('Communication link lost');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Auto-refresh for live mode with discovery simulation  
  useEffect(() => {
    if (!isLiveMode) return;
    
    const interval = setInterval(() => {
      fetchRoverData(selectedSol, true); // Force refresh for live data
      
      // Simulate discoveries occasionally (5% chance)
      if (Math.random() < 0.05 && selectedSol) {
        const discoveries = [
          {
            type: 'discovery',
            title: 'GEOLOGICAL FORMATION DETECTED',
            message: 'Unusual rock stratification pattern identified via SUPERCAM analysis',
            sol: selectedSol
          },
          {
            type: 'sample',
            title: 'SAMPLE COLLECTION CANDIDATE',
            message: 'High-priority target identified for future drilling operation',
            sol: selectedSol
          },
          {
            type: 'data',
            title: 'ATMOSPHERIC ANOMALY',
            message: 'Unexpected methane trace detected in current atmospheric readings',
            sol: selectedSol
          }
        ];
        
        const randomDiscovery = discoveries[Math.floor(Math.random() * discoveries.length)];
        setNotifications(prev => [...prev.slice(-2), randomDiscovery]); // Keep only last 3
      }
    }, DataCache.UPDATE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [selectedSol, isLiveMode, fetchRoverData]);
  
  const handleSolChange = useCallback((newSol) => {
    if (newSol !== selectedSol) {
      // Save current zoom level for the current SOL
      if (selectedSol !== null) {
        setMapZoomMemory(prev => ({
          ...prev,
          [selectedSol]: mapZoomLevel
        }));
      }
      
      // Restore zoom level for the new SOL
      const savedZoom = mapZoomMemory[newSol];
      if (savedZoom) {
        setMapZoomLevel(savedZoom);
      }
      
      fetchRoverData(newSol);
    }
  }, [selectedSol, fetchRoverData, mapZoomLevel, mapZoomMemory]);
  
  const handleLocationClick = useCallback((location) => {
    console.log('Location clicked:', location);
  }, []);
  
  const handleNotificationDismiss = useCallback((index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  // Map zoom controls
  const handleZoomIn = useCallback(() => {
    setMapZoomLevel(prev => Math.min(prev * 1.2, 3));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setMapZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  }, []);
  
  const handleResetZoom = useCallback(() => {
    setMapZoomLevel(1);
  }, []);
  
  // Generate optimized telemetry data - Move all hooks before conditional returns
  const generateTelemetryData = useCallback((baseValue, variation, sols = 50) => {
    return Array.from({length: sols}, (_, i) => {
      const sol = Math.max(0, selectedSol - sols + i + 1);
      return Math.max(0, baseValue + variation * Math.sin(sol * 0.1) + (Math.random() - 0.5) * variation * 0.2);
    });
  }, [selectedSol]);
  
  const tempData = React.useMemo(() => generateTelemetryData(203, 20), [generateTelemetryData]);
  const windData = React.useMemo(() => generateTelemetryData(32, 15), [generateTelemetryData]);
  const radiationData = React.useMemo(() => generateTelemetryData(203, 30), [generateTelemetryData]);
  const distanceData = React.useMemo(() => generateTelemetryData(2, 0.5), [generateTelemetryData]);
  const dustData = React.useMemo(() => generateTelemetryData(150, 80), [generateTelemetryData]);

  useEffect(() => {
    fetchRoverData();
  }, [fetchRoverData]);
  
  // Conditional returns AFTER all hooks
  if (loading) {
    return (
      <div className="nasa-loading">
        <div className="loading-container">
          <div className="nasa-loading-spinner"></div>
          <div className="loading-text">
            <div className="primary-text">NASA MARS MISSION CONTROL</div>
            <div className="secondary-text">Establishing real-time connection to Perseverance rover...</div>
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
  
  return (
    <div className="nasa-app">
      {/* Real-time Notifications */}
      <NASANotifications 
        notifications={notifications} 
        onDismiss={handleNotificationDismiss} 
      />
      

      
      {/* NASA Header with Real-time Status */}
      <header className="nasa-header">
        <div className="header-left">
          <div className="nasa-logo">NASA</div>
          <div className="mission-info">
            <div className="mission-name">MARS PERSEVERANCE</div>
            <div className="mission-location">JPL • JEZERO CRATER • MARS</div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="live-status">
            <button 
              className={`live-toggle ${isLiveMode ? 'active' : ''}`}
              onClick={() => setIsLiveMode(!isLiveMode)}
            >
              {isLiveMode ? '🔴 LIVE' : '⚪ OFFLINE'}
            </button>
            {lastUpdateTime && (
              <div className="last-update">
                Updated: {lastUpdateTime.toLocaleTimeString()}
              </div>
            )}
          </div>
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
        <div className={`nasa-left-panel ${leftPanelCollapsed ? 'collapsed' : ''} ${telemetryMode === 'horizontal' ? 'horizontal-mode' : ''}`}>
          <div className="panel-header">
            <h3>TELEMETRY DATA</h3>
            <div className={`live-indicator ${isLiveMode ? 'live' : 'offline'}`}>
              {isLiveMode ? 'LIVE' : 'OFFLINE'}
            </div>
          </div>
          
          {/* Telemetry Grouping Tabs */}
          <div className="telemetry-tabs">
            <button 
              className={`telemetry-tab ${telemetryGroup === 'all' ? 'active' : ''}`}
              onClick={() => setTelemetryGroup('all')}
            >
              ALL
            </button>
            <button 
              className={`telemetry-tab ${telemetryGroup === 'environmental' ? 'active' : ''}`}
              onClick={() => setTelemetryGroup('environmental')}
            >
              ENV
            </button>
            <button 
              className={`telemetry-tab ${telemetryGroup === 'systems' ? 'active' : ''}`}
              onClick={() => setTelemetryGroup('systems')}
            >
              SYS
            </button>
            <button 
              className={`telemetry-tab ${telemetryGroup === 'atmospheric' ? 'active' : ''}`}
              onClick={() => setTelemetryGroup('atmospheric')}
            >
              ATM
            </button>
          </div>
          
          <div className="telemetry-stack">
            {loading ? (
              <>
                <TelemetryCardSkeleton />
                <TelemetryCardSkeleton />
                <TelemetryCardSkeleton />
                <TelemetryCardSkeleton />
                <TelemetryCardSkeleton />
              </>
            ) : (
              <>
                {(telemetryGroup === 'all' || telemetryGroup === 'environmental') && (
                  <NASATelemetryCard
                title="Temperature"
                value="203"
                unit="K (-70°C)"
                data={tempData}
                color="#00ff88"
                type="line"
                subtitle="AVERAGE 200K | RANGE 180K-220K"
                isLive={isLiveMode}
              />
            )}
            
            {(telemetryGroup === 'all' || telemetryGroup === 'environmental') && (
              <NASATelemetryCard
                title="Wind Speed"
                value="32"
                unit="KMH"
                data={windData}
                color="#0ea5e9"
                type="bar"
                subtitle="MAX 45 KMH | DIR NE"
                isLive={isLiveMode}
              />
            )}
            
            {(telemetryGroup === 'all' || telemetryGroup === 'systems') && (
              <NASATelemetryCard
                title="Radiation"
                value="203"
                unit="K"
                data={radiationData}
                color="#f59e0b"
                type="bar"
                subtitle="LEVEL NORMAL | SAFE RANGE"
                isLive={isLiveMode}
              />
            )}
            
            {(telemetryGroup === 'all' || telemetryGroup === 'systems') && (
              <NASATelemetryCard
                title="Distance Traveled"
                value="+2"
                unit="m/sec"
                data={distanceData}
                color="#10b981"
                type="line"
                subtitle="72 KM/H AVG | 1 HR 12 MIN"
                isLive={isLiveMode}
              />
            )}
            
            {(telemetryGroup === 'all' || telemetryGroup === 'atmospheric') && (
              <NASATelemetryCard
                title="Dust Properties"
                value={Math.round(dustData[dustData.length - 1] || 0)}  
                unit="μg/m³"
                data={dustData}
                color="#8b5cf6"
                type="bar"
                subtitle="ATMOSPHERIC DUST LEVEL | OPACITY 0.8"
                isLive={isLiveMode}
              />
                )}
              </>
            )}
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
          
          {loading ? (
            <MapSkeleton />
          ) : (
            <NASAMarsMap 
              route={roverData.map.route}
              currentPosition={roverData.map.current_position}
              selectedSol={selectedSol}
              onLocationClick={handleLocationClick}
              zoomLevel={mapZoomLevel}
            />
          )}
          
          {/* Map Zoom Controls */}
          {!loading && (
            <div className="map-zoom-controls">
              <button className="zoom-btn" onClick={handleZoomIn} title="Zoom In">
                +
              </button>
              <button className="zoom-btn" onClick={handleResetZoom} title="Reset Zoom">
                ⌂
              </button>
              <button className="zoom-btn" onClick={handleZoomOut} title="Zoom Out">
                −
              </button>
              <div className="zoom-level">
                {Math.round(mapZoomLevel * 100)}%
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Camera Systems */}
        <div className={`nasa-right-panel ${rightPanelCollapsed ? 'collapsed' : ''}`}>
          {loading ? (
            <div className="nasa-camera-section">
              <div className="section-header">
                <h3>CAMERA SYSTEMS</h3>
                <div className="image-count">Loading...</div>
              </div>
              <div className="nasa-camera-grid-enhanced">
                <ImageSkeleton />
                <ImageSkeleton />
                <ImageSkeleton />
                <ImageSkeleton />
                <ImageSkeleton />
                <ImageSkeleton />
              </div>
            </div>
          ) : (
            <NASACameraGallery cameras={roverData.cameras} />
          )}
        </div>
      </div>

      {/* ADVANCED MISSION TIMELINE - Fixed Bottom */}
      <div className="nasa-timeline-container">
        <AdvancedMissionTimeline 
          sols={roverData.timeline.sols}
          selectedSol={selectedSol}
          onSolChange={handleSolChange}
        />
      </div>
    </div>
  );
}

export default App;