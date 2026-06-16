import time
import requests

# 1. Configuration
# Make sure your backend server is running!
BASE_URL = "http://localhost:5000"

# Replace with an actual Shipment ID from your database
SHIPMENT_ID = "YOUR_SHIPMENT_ID_HERE"

# Replace with your actual auth token (grab it from your browser's Application tab -> Session Storage)
TOKEN = "YOUR_LOGIN_TOKEN_HERE"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# 2. A simulated route (e.g., driving down a highway)
simulated_route = [
    {"lat": 34.0522, "lng": -118.2437, "addr": "Downtown LA - Origin Hub"},
    {"lat": 34.0528, "lng": -118.2450, "addr": "1st Street Checkpoint"},
    {"lat": 34.0535, "lng": -118.2465, "addr": "2nd Street Checkpoint"},
    {"lat": 34.0545, "lng": -118.2480, "addr": "Highway 101 On-ramp"},
    {"lat": 34.0560, "lng": -118.2500, "addr": "In Transit - Highway 101 North"},
    {"lat": 34.0580, "lng": -118.2530, "addr": "Approaching Destination"},
    {"lat": 34.0600, "lng": -118.2550, "addr": "Arrived at Destination Hub"}
]

print(f"Starting simulated delivery for shipment {SHIPMENT_ID}...\n")

for point in simulated_route:
    payload = {
        "latitude": point["lat"],
        "longitude": point["lng"],
        "address": point["addr"]
    }
    
    # Send PUT request to your backend
    url = f"{BASE_URL}/api/shipments/{SHIPMENT_ID}/location"
    
    try:
        response = requests.put(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            print(f"✅ Location updated: {point['addr']} ({point['lat']}, {point['lng']})")
        else:
            print(f"❌ Failed to update location. Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Failed to connect to the backend. Is your server running on port 5000?")
        break
        
    # Wait 5 seconds before the truck 'moves' again
    time.sleep(5)

print("\nSimulation complete!")
