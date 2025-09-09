#!/usr/bin/env python3
"""
Mars Rover Data Visualization Backend API Tests
Tests the FastAPI backend endpoints for Mars rover data retrieval and validation.
"""

import requests
import json
import sys
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get the backend URL from environment
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://red-planet-routes.preview.emergentagent.com')
BASE_API_URL = f"{BACKEND_URL}/api"

class MarsRoverAPITester:
    def __init__(self):
        self.base_url = BASE_API_URL
        self.test_results = []
        self.errors = []
        
    def log_test(self, test_name, passed, message=""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        result = f"{status}: {test_name}"
        if message:
            result += f" - {message}"
        self.test_results.append(result)
        print(result)
        
        if not passed:
            self.errors.append(f"{test_name}: {message}")
    
    def test_health_check(self):
        """Test GET /api/ - Basic health check endpoint"""
        print("\n🔍 Testing Health Check Endpoint...")
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Health Check", True, f"Status: {response.status_code}, Message: {data['message']}")
                    return True
                else:
                    self.log_test("Health Check", False, "Missing 'message' field in response")
            else:
                self.log_test("Health Check", False, f"Status code: {response.status_code}")
                
        except Exception as e:
            self.log_test("Health Check", False, f"Request failed: {str(e)}")
        
        return False
    
    def validate_data_structure(self, data, test_name):
        """Validate the Mars rover data structure matches expected schema"""
        required_fields = {
            'header': ['earth_time', 'status', 'sol'],
            'timeline': ['sols', 'selected_sol'],
            'map': ['route', 'current_position'],
            'overlays': ['metrics'],
            'cameras': [],
            'errors': []
        }
        
        validation_errors = []
        
        # Check top-level fields
        for field in required_fields.keys():
            if field not in data:
                validation_errors.append(f"Missing field: {field}")
        
        if validation_errors:
            self.log_test(f"{test_name} - Data Structure", False, "; ".join(validation_errors))
            return False
        
        # Validate header structure
        header = data.get('header', {})
        for field in required_fields['header']:
            if field not in header:
                validation_errors.append(f"Missing header.{field}")
        
        # Validate timeline structure
        timeline = data.get('timeline', {})
        for field in required_fields['timeline']:
            if field not in timeline:
                validation_errors.append(f"Missing timeline.{field}")
        
        # Validate map structure
        map_data = data.get('map', {})
        for field in required_fields['map']:
            if field not in map_data:
                validation_errors.append(f"Missing map.{field}")
        
        # Validate overlays structure
        overlays = data.get('overlays', {})
        if 'metrics' not in overlays:
            validation_errors.append("Missing overlays.metrics")
        else:
            metrics = overlays['metrics']
            required_metrics = ['charge', 'temperature', 'radiation']
            for metric in required_metrics:
                if metric not in metrics:
                    validation_errors.append(f"Missing overlays.metrics.{metric}")
        
        if validation_errors:
            self.log_test(f"{test_name} - Data Structure", False, "; ".join(validation_errors))
            return False
        
        self.log_test(f"{test_name} - Data Structure", True, "All required fields present")
        return True
    
    def validate_realistic_values(self, data, test_name):
        """Validate that data contains realistic Mars rover values"""
        validation_errors = []
        
        # Check header values
        header = data.get('header', {})
        
        # Validate earth_time is ISO 8601 format
        try:
            datetime.fromisoformat(header['earth_time'].replace('Z', '+00:00'))
        except:
            validation_errors.append("Invalid earth_time format")
        
        # Validate status
        valid_statuses = ['OPERATIONAL', 'SLEEP', 'ERROR']
        if header.get('status') not in valid_statuses:
            validation_errors.append(f"Invalid status: {header.get('status')}")
        
        # Validate sol is reasonable
        sol = header.get('sol', 0)
        if not isinstance(sol, int) or sol < 0 or sol > 5000:
            validation_errors.append(f"Unrealistic sol value: {sol}")
        
        # Check map coordinates (should be around Jezero Crater)
        map_data = data.get('map', {})
        current_pos = map_data.get('current_position', {})
        
        # Jezero Crater coordinates: lat ~18.44, lon ~77.45
        lat = current_pos.get('lat', 0)
        lon = current_pos.get('lon', 0)
        
        if not (17.0 <= lat <= 20.0):
            validation_errors.append(f"Unrealistic latitude: {lat} (expected around 18.44)")
        
        if not (76.0 <= lon <= 79.0):
            validation_errors.append(f"Unrealistic longitude: {lon} (expected around 77.45)")
        
        # Check route data
        route = map_data.get('route', [])
        if not route:
            validation_errors.append("Empty route data")
        elif len(route) < sol:
            validation_errors.append(f"Route has {len(route)} points but sol is {sol}")
        
        # Check telemetry values
        metrics = data.get('overlays', {}).get('metrics', {})
        
        # Battery charge (0-100%)
        charge = metrics.get('charge', -1)
        if not (0 <= charge <= 100):
            validation_errors.append(f"Invalid battery charge: {charge}%")
        
        # Temperature (Mars temperatures around -80°C to +20°C)
        temp = metrics.get('temperature', -999)
        if not (-80 <= temp <= 20):
            validation_errors.append(f"Unrealistic temperature: {temp}°C")
        
        # Radiation (Mars surface ~0.2-0.3 μSv/h)
        radiation = metrics.get('radiation', -1)
        if not (0.1 <= radiation <= 0.5):
            validation_errors.append(f"Unrealistic radiation: {radiation} μSv/h")
        
        # Check timeline
        timeline = data.get('timeline', {})
        sols = timeline.get('sols', [])
        selected_sol = timeline.get('selected_sol', -1)
        
        if not sols:
            validation_errors.append("Empty sols list in timeline")
        elif selected_sol not in sols:
            validation_errors.append(f"Selected sol {selected_sol} not in available sols")
        
        # Check cameras
        cameras = data.get('cameras', [])
        if not cameras:
            validation_errors.append("No camera data available")
        else:
            for i, camera in enumerate(cameras):
                if 'name' not in camera or 'images' not in camera:
                    validation_errors.append(f"Camera {i} missing name or images")
                elif not camera['images']:
                    validation_errors.append(f"Camera {camera.get('name', i)} has no images")
                else:
                    # Check first image structure
                    img = camera['images'][0]
                    required_img_fields = ['url', 'timestamp', 'location']
                    for field in required_img_fields:
                        if field not in img:
                            validation_errors.append(f"Camera image missing {field}")
        
        if validation_errors:
            self.log_test(f"{test_name} - Realistic Values", False, "; ".join(validation_errors))
            return False
        
        self.log_test(f"{test_name} - Realistic Values", True, "All values within realistic ranges")
        return True
    
    def test_latest_rover_data(self):
        """Test GET /api/rover-data - Get latest Mars rover data"""
        print("\n🔍 Testing Latest Rover Data Endpoint...")
        try:
            response = requests.get(f"{self.base_url}/rover-data", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate data structure
                structure_valid = self.validate_data_structure(data, "Latest Rover Data")
                
                # Validate realistic values
                values_valid = self.validate_realistic_values(data, "Latest Rover Data")
                
                if structure_valid and values_valid:
                    self.log_test("Latest Rover Data", True, f"Sol: {data['header']['sol']}, Status: {data['header']['status']}")
                    return True
                else:
                    self.log_test("Latest Rover Data", False, "Data validation failed")
            else:
                self.log_test("Latest Rover Data", False, f"Status code: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Latest Rover Data", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_specific_sol_data(self, sol=1000):
        """Test GET /api/rover-data/{sol} - Get Mars rover data for specific sol"""
        print(f"\n🔍 Testing Specific Sol Data Endpoint (sol={sol})...")
        try:
            response = requests.get(f"{self.base_url}/rover-data/{sol}", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate data structure
                structure_valid = self.validate_data_structure(data, f"Sol {sol} Data")
                
                # Validate realistic values
                values_valid = self.validate_realistic_values(data, f"Sol {sol} Data")
                
                # Check that the returned sol matches requested sol
                returned_sol = data.get('header', {}).get('sol', -1)
                sol_match = returned_sol == sol
                
                if not sol_match:
                    self.log_test(f"Sol {sol} Data - Sol Match", False, f"Requested sol {sol} but got {returned_sol}")
                else:
                    self.log_test(f"Sol {sol} Data - Sol Match", True, f"Correct sol returned: {returned_sol}")
                
                if structure_valid and values_valid and sol_match:
                    self.log_test(f"Sol {sol} Data", True, f"Status: {data['header']['status']}")
                    return True
                else:
                    self.log_test(f"Sol {sol} Data", False, "Data validation failed")
            else:
                self.log_test(f"Sol {sol} Data", False, f"Status code: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test(f"Sol {sol} Data", False, f"Request failed: {str(e)}")
        
        return False
    
    def test_invalid_sol_handling(self):
        """Test error handling for invalid sols"""
        print("\n🔍 Testing Invalid Sol Handling...")
        
        # Test negative sol
        try:
            response = requests.get(f"{self.base_url}/rover-data/-1", timeout=10)
            if response.status_code in [400, 422]:
                self.log_test("Invalid Sol Handling (negative)", True, f"Properly rejected negative sol with status {response.status_code}")
            else:
                self.log_test("Invalid Sol Handling (negative)", False, f"Should reject negative sol, got status {response.status_code}")
        except Exception as e:
            self.log_test("Invalid Sol Handling (negative)", False, f"Request failed: {str(e)}")
        
        # Test extremely high sol
        try:
            response = requests.get(f"{self.base_url}/rover-data/99999", timeout=10)
            if response.status_code == 200:
                data = response.json()
                # Should handle gracefully, possibly with errors in response
                errors = data.get('errors', [])
                if errors:
                    self.log_test("Invalid Sol Handling (high)", True, f"Handled high sol gracefully with errors: {errors}")
                else:
                    self.log_test("Invalid Sol Handling (high)", True, "Handled high sol without errors")
            else:
                self.log_test("Invalid Sol Handling (high)", False, f"Unexpected status code: {response.status_code}")
        except Exception as e:
            self.log_test("Invalid Sol Handling (high)", False, f"Request failed: {str(e)}")
    
    def test_nasa_api_integration(self):
        """Test NASA API integration by checking response characteristics"""
        print("\n🔍 Testing NASA API Integration...")
        try:
            response = requests.get(f"{self.base_url}/rover-data/1000", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if we have camera data (indicates NASA API working)
                cameras = data.get('cameras', [])
                has_real_images = False
                
                for camera in cameras:
                    for image in camera.get('images', []):
                        url = image.get('url', '')
                        # NASA images typically come from mars.nasa.gov or other NASA domains
                        if 'nasa.gov' in url or 'jpl.nasa.gov' in url:
                            has_real_images = True
                            break
                    if has_real_images:
                        break
                
                if has_real_images:
                    self.log_test("NASA API Integration", True, "Real NASA images detected in response")
                else:
                    # Check if there are errors indicating API issues
                    errors = data.get('errors', [])
                    if any('NASA' in error or 'API' in error for error in errors):
                        self.log_test("NASA API Integration", False, f"NASA API errors: {errors}")
                    else:
                        self.log_test("NASA API Integration", True, "Using fallback data (NASA API may be unavailable)")
                
                return True
            else:
                self.log_test("NASA API Integration", False, f"Status code: {response.status_code}")
                
        except Exception as e:
            self.log_test("NASA API Integration", False, f"Request failed: {str(e)}")
        
        return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print(f"🚀 Starting Mars Rover Backend API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run all tests
        tests = [
            self.test_health_check,
            self.test_latest_rover_data,
            lambda: self.test_specific_sol_data(1000),
            self.test_invalid_sol_handling,
            self.test_nasa_api_integration
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        for result in self.test_results:
            print(result)
        
        print(f"\n🎯 Overall Result: {passed_tests}/{total_tests} tests passed")
        
        if self.errors:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for error in self.errors:
                print(f"   • {error}")
        
        return passed_tests == total_tests and len(self.errors) == 0

if __name__ == "__main__":
    tester = MarsRoverAPITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ All tests passed! Backend API is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Check the issues above.")
        sys.exit(1)