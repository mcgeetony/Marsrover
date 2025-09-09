from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
import json
from typing import Optional, List
from datetime import datetime
import math

app = FastAPI(
    title="Mars Rover Mission Control API",
    description="NASA Mars Rover Data Visualization API - Vercel Optimized",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NASA API configuration
NASA_API_KEY = os.environ.get("NASA_API_KEY", "9JjogYWIPOUHJKl7RMUmM0pUuepH6wiafS8zgs0d")
NASA_BASE_URL = "https://api.nasa.gov/mars-photos/api/v1"

# Pydantic models
class Metrics(BaseModel):
    charge: int
    temperature: float
    radiation: float
    dust_opacity: float
    dust_storm_activity: int
    dust_accumulation: float
    atmospheric_dust_levels: int

class Position(BaseModel):
    lat: float
    lon: float
    sol: int

class CameraImage(BaseModel):
    url: str
    timestamp: str
    sol: int

class Camera(BaseModel):
    name: str
    images: List[CameraImage]

class MapData(BaseModel):
    route: List[Position]
    current_position: Position

class RoverData(BaseModel):
    currentSol: int
    telemetry: Metrics
    map: MapData
    cameras: List[Camera]
    lastUpdate: str

def generate_telemetry(sol: int) -> Metrics:
    """Generate realistic telemetry data"""
    # Simulate battery charge with daily cycles
    base_charge = 90 - (sol * 0.01)
    daily_variation = 15 * math.sin(sol * 0.5)
    charge = max(0, min(100, int(base_charge + daily_variation)))
    
    # Mars surface temperature
    temp_base = -70
    seasonal_variation = 10 * math.sin(sol * 0.017)
    daily_variation = 20 * math.sin(sol * 0.26)
    temperature = round(temp_base + seasonal_variation + daily_variation, 1)
    
    # Radiation levels
    radiation = round(0.24 + 0.03 * math.sin(sol * 0.1), 2)
    
    # Dust properties
    base_opacity = 0.8
    seasonal_dust = 0.4 * math.sin(sol * 0.01)
    storm_factor = 0.6 * abs(math.sin(sol * 0.02))
    dust_opacity = round(max(0.3, base_opacity + seasonal_dust + storm_factor), 2)
    
    base_activity = 15
    seasonal_activity = 20 * math.sin(sol * 0.008)
    dust_storm_activity = max(0, min(100, int(base_activity + seasonal_activity)))
    
    base_accumulation = 2.0
    accumulation_growth = sol * 0.01
    cleaning_cycles = -1.5 * math.floor(sol / 100)
    dust_accumulation = round(max(0.1, base_accumulation + accumulation_growth + cleaning_cycles), 2)
    
    dust_base = 120
    atmospheric_variation = 60 * (dust_opacity - 0.5)
    atmospheric_dust_levels = max(50, int(dust_base + atmospheric_variation))
    
    return Metrics(
        charge=charge,
        temperature=temperature,
        radiation=radiation,
        dust_opacity=dust_opacity,
        dust_storm_activity=dust_storm_activity,
        dust_accumulation=dust_accumulation,
        atmospheric_dust_levels=atmospheric_dust_levels
    )

def generate_route_data(sol: int) -> List[Position]:
    """Generate rover route based on sol"""
    route = []
    base_lat, base_lon = 18.4447, 77.4508  # Jezero Crater
    
    for i in range(0, min(sol + 1, 100), 5):  # Generate points every 5 sols
        # Simple spiral pattern for route
        angle = i * 0.1
        radius = i * 0.0001
        lat = base_lat + radius * math.cos(angle)
        lon = base_lon + radius * math.sin(angle)
        route.append(Position(lat=lat, lon=lon, sol=i))
    
    return route

async def fetch_nasa_images(sol: int) -> List[CameraImage]:
    """Fetch real NASA images for the sol"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{NASA_BASE_URL}/rovers/perseverance/photos?sol={sol}&api_key={NASA_API_KEY}"
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                images = []
                
                for photo in data.get("photos", [])[:6]:  # Limit to 6 images
                    images.append(CameraImage(
                        url=photo["img_src"],
                        timestamp=photo["earth_date"],
                        sol=photo["sol"]
                    ))
                
                return images
    except Exception as e:
        print(f"Error fetching NASA images: {e}")
    
    # Fallback images
    return [
        CameraImage(
            url="https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/01000/opgs/edr/ncam/NLB_449465139EDR_F0481570NCAM00320M_.JPG",
            timestamp=datetime.now().isoformat(),
            sol=sol
        )
    ]

@app.get("/api/")
async def health_check():
    return {"message": "Mars Rover Mission Control API - Vercel Optimized"}

@app.get("/api/rover-data", response_model=RoverData)
async def get_latest_rover_data():
    return await get_rover_data_by_sol(1000)

@app.get("/api/rover-data/{sol}", response_model=RoverData)
async def get_rover_data_by_sol(sol: int):
    try:
        # Generate telemetry
        telemetry = generate_telemetry(sol)
        
        # Generate route data
        route = generate_route_data(sol)
        current_position = route[-1] if route else Position(lat=18.4447, lon=77.4508, sol=sol)
        
        # Fetch images
        images = await fetch_nasa_images(sol)
        cameras = [Camera(name="Navigation Camera", images=images)]
        
        # Create map data
        map_data = MapData(route=route, current_position=current_position)
        
        return RoverData(
            currentSol=sol,
            telemetry=telemetry,
            map=map_data,
            cameras=cameras,
            lastUpdate=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching rover data: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)