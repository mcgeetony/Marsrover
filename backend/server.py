from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# NASA API Configuration
NASA_API_KEY = os.environ.get('NASA_API_KEY', '9JjogYWIPOUHJKl7RMUmM0pUuepH6wiafS8zgs0d')
NASA_BASE_URL = "https://api.nasa.gov/mars-photos/api/v1"

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models for Mars Rover Data
class Location(BaseModel):
    lat: float
    lon: float
    sol: Optional[int] = None

class RoutePoint(BaseModel):
    lat: float
    lon: float
    sol: int

class Metrics(BaseModel):
    charge: int  # Battery percentage
    temperature: float  # Celsius
    radiation: float  # microSieverts/hour
    dust_opacity: float  # Atmospheric dust opacity (tau)
    dust_storm_activity: int  # Storm activity level (0-100)
    dust_accumulation: float  # Dust on solar panels (mg/cm²)
    atmospheric_dust_levels: int  # Atmospheric dust concentration (μg/m³)

class CameraImage(BaseModel):
    url: str
    timestamp: str
    location: Location

class Camera(BaseModel):
    name: str
    images: List[CameraImage]

class Header(BaseModel):
    earth_time: str  # ISO 8601 UTC
    status: str  # OPERATIONAL, SLEEP, ERROR
    sol: int

class Timeline(BaseModel):
    sols: List[int]
    selected_sol: int

class MapData(BaseModel):
    route: List[RoutePoint]
    current_position: Location

class Overlays(BaseModel):
    metrics: Metrics

class MarsRoverData(BaseModel):
    header: Header
    timeline: Timeline
    map: MapData
    overlays: Overlays
    cameras: List[Camera]
    errors: List[str]

# Cache for rover data
rover_data_cache = {}
cache_timestamp = None
CACHE_DURATION = 0  # Disable cache for testing

async def fetch_nasa_rover_data(sol: int = None):
    """Fetch data from NASA Mars Photos API for Perseverance rover"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get photos for the specified sol or latest
            if sol:
                url = f"{NASA_BASE_URL}/rovers/perseverance/photos?sol={sol}&api_key={NASA_API_KEY}"
            else:
                url = f"{NASA_BASE_URL}/rovers/perseverance/latest_photos?api_key={NASA_API_KEY}"
            
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            return data
    except Exception as e:
        logging.error(f"Error fetching NASA data: {e}")
        return None

def generate_mock_route_data(max_sol: int) -> List[RoutePoint]:
    """Generate realistic mock route data for Perseverance rover at Jezero Crater"""
    # Perseverance landing site coordinates in Jezero Crater
    base_lat = 18.4447
    base_lon = 77.4508
    
    route = []
    for sol in range(0, max_sol + 1):
        # Simulate rover movement - small increments each sol
        lat_offset = (sol * 0.0001) * (1 if sol % 3 != 0 else -0.5)  # Some variation in movement
        lon_offset = (sol * 0.0002) * (1 if sol % 2 == 0 else -0.3)
        
        route.append(RoutePoint(
            lat=base_lat + lat_offset,
            lon=base_lon + lon_offset,
            sol=sol
        ))
    
    return route

def generate_mock_telemetry(sol: int) -> Metrics:
    """Generate realistic telemetry data based on sol"""
    import math
    
    # Simulate battery charge with daily cycles and degradation
    base_charge = 90 - (sol * 0.01)  # Slow degradation over time
    daily_variation = 15 * math.sin(sol * 0.5)  # Daily charge cycles
    charge = max(30, min(100, int(base_charge + daily_variation)))
    
    # Simulate temperature variations (Mars has extreme temperature swings)
    temp_base = -28.0
    seasonal_variation = 10 * math.sin(sol * 0.017)  # Seasonal changes
    daily_variation = 25 * math.sin(sol * 2.0)  # Day/night cycles
    temperature = round(temp_base + seasonal_variation + daily_variation, 1)
    
    # Simulate radiation levels (relatively stable on Mars)
    radiation = round(0.24 + 0.03 * math.sin(sol * 0.1), 2)
    
    # Simulate dust properties (realistic Mars atmospheric conditions)
    # Dust opacity (tau) - typical range 0.3-3.0, higher during dust storms
    base_opacity = 0.8
    seasonal_dust = 0.4 * math.sin(sol * 0.01)  # Seasonal dust variations
    storm_factor = 0.6 * abs(math.sin(sol * 0.02))  # Occasional dust storms
    dust_opacity = round(max(0.3, base_opacity + seasonal_dust + storm_factor), 2)
    
    # Dust storm activity (0-100 scale)
    base_activity = 15
    seasonal_activity = 20 * math.sin(sol * 0.008)  # Seasonal storm patterns
    random_activity = 10 * math.sin(sol * 0.05)  # Random variations
    dust_storm_activity = max(0, min(100, int(base_activity + seasonal_activity + random_activity)))
    
    # Dust accumulation on solar panels (mg/cm²)
    base_accumulation = 2.0
    accumulation_growth = sol * 0.01  # Gradual accumulation over time
    cleaning_cycles = -1.5 * math.floor(sol / 100)  # Cleaning every 100 sols
    dust_accumulation = round(max(0.1, base_accumulation + accumulation_growth + cleaning_cycles), 2)
    
    # Atmospheric dust levels (μg/m³) - correlates with opacity
    dust_base = 120
    atmospheric_variation = 60 * (dust_opacity - 0.5)  # Based on opacity
    seasonal_dust_atm = 30 * math.sin(sol * 0.012)
    atmospheric_dust_levels = max(50, int(dust_base + atmospheric_variation + seasonal_dust_atm))
    
    return Metrics(
        charge=charge,
        temperature=temperature,
        radiation=radiation,
        dust_opacity=dust_opacity,
        dust_storm_activity=dust_storm_activity,
        dust_accumulation=dust_accumulation,
        atmospheric_dust_levels=atmospheric_dust_levels
    )

@api_router.get("/")
async def root():
    return {"message": "Mars Rover Data Visualization API"}

@api_router.get("/rover-data", response_model=MarsRoverData)
async def get_rover_data(sol: Optional[int] = None):
    """Get Mars rover data for the specified sol or latest"""
    global rover_data_cache, cache_timestamp
    
    errors = []
    
    try:
        # Use cache if recent and same sol
        current_time = datetime.now(timezone.utc)
        cache_key = sol or "latest"
        
        if (cache_timestamp and 
            (current_time - cache_timestamp).total_seconds() < CACHE_DURATION and
            cache_key in rover_data_cache):
            return rover_data_cache[cache_key]
        
        # Fetch fresh data from NASA API
        nasa_data = await fetch_nasa_rover_data(sol)
        
        # Always use the requested SOL, not the SOL from NASA API response
        selected_sol = sol or 1000
        
        if not nasa_data or "photos" not in nasa_data:
            errors.append("No data available from NASA API")
        else:
            photos = nasa_data["photos"]
            if not photos:
                errors.append(f"No photos available for sol {sol}")
        
        # Generate available sols (simulate available mission data)
        available_sols = list(range(max(0, selected_sol - 100), selected_sol + 1))
        
        # Generate route data
        route_data = generate_mock_route_data(selected_sol)
        current_position = route_data[-1] if route_data else RoutePoint(lat=18.4447, lon=77.4508, sol=selected_sol)
        
        # Generate telemetry
        metrics = generate_mock_telemetry(selected_sol)
        
        # Process camera data
        cameras = []
        if nasa_data and "photos" in nasa_data and nasa_data["photos"]:
            # Group photos by camera
            camera_groups = {}
            for photo in nasa_data["photos"][:20]:  # Limit to 20 photos
                camera_name = photo["camera"]["full_name"]
                if camera_name not in camera_groups:
                    camera_groups[camera_name] = []
                
                camera_groups[camera_name].append(CameraImage(
                    url=photo["img_src"],
                    timestamp=photo["earth_date"] + "T12:00:00Z",  # Mock timestamp
                    location=Location(
                        lat=current_position.lat + (len(camera_groups[camera_name]) * 0.0001),
                        lon=current_position.lon + (len(camera_groups[camera_name]) * 0.0001)
                    )
                ))
            
            for camera_name, images in camera_groups.items():
                cameras.append(Camera(name=camera_name, images=images))
        
        # If no real photos, add placeholder
        if not cameras:
            cameras.append(Camera(
                name="Navigation Camera", 
                images=[
                    CameraImage(
                        url="https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/01000/opgs/edr/ncam/NLB_486265257EDR_F0481570NCAM00323M_.JPG",
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        location=Location(lat=current_position.lat, lon=current_position.lon)
                    )
                ]
            ))
        
        # Determine rover status
        status = "OPERATIONAL"
        if selected_sol > 1200:  # Simulate some status variations
            status = "SLEEP" if selected_sol % 10 == 0 else "OPERATIONAL"
        
        # Build response
        rover_data = MarsRoverData(
            header=Header(
                earth_time=datetime.now(timezone.utc).isoformat(),
                status=status,
                sol=selected_sol
            ),
            timeline=Timeline(
                sols=available_sols,
                selected_sol=selected_sol
            ),
            map=MapData(
                route=route_data,
                current_position=Location(
                    lat=current_position.lat,
                    lon=current_position.lon,
                    sol=current_position.sol
                )
            ),
            overlays=Overlays(metrics=metrics),
            cameras=cameras,
            errors=errors
        )
        
        # Cache the result
        rover_data_cache[cache_key] = rover_data
        cache_timestamp = current_time
        
        return rover_data
        
    except Exception as e:
        logging.error(f"Error in get_rover_data: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@api_router.get("/rover-data/{sol}", response_model=MarsRoverData)
async def get_rover_data_by_sol(sol: int):
    """Get Mars rover data for a specific sol"""
    return await get_rover_data(sol)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()