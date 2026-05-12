# Leaflet Map Integration Guide

## Overview

This guide explains how to integrate the new Leaflet-based map features into your Dechta client application. The implementation includes:

- **Real-time location fetching** using Geolocation API
- **Interactive Leaflet maps** for location selection
- **Distance calculation** using Haversine formula
- **Delivery time estimation** based on calculated distance
- **Live tracking** capabilities

---

## New Files Added

### 1. **Utility File: `src/utils/distanceCalculator.js`**
   - Core utility functions for all map and distance operations
   - No dependencies on React components
   - Can be used anywhere in your app

**Key Functions:**
```javascript
calculateDistance(lat1, lon1, lat2, lon2)           // Calculate distance between two points
kmToMiles(km)                                        // Convert km to miles
estimateDeliveryTime(distanceKm)                     // Estimate delivery time
getCurrentLocation()                                 // Get user's current location
watchUserLocation(onSuccess, onError)                // Live location tracking
geocodeAddress(address)                              // Address to coordinates
reverseGeocodeCoordinates(lat, lng)                  // Coordinates to address
```

### 2. **Component: `src/components/LeafletMapComponent.jsx`**
   - Reusable Leaflet map component
   - Shows location picker with center marker
   - Real-time distance visualization
   - Built-in control buttons

**Props:**
```javascript
<LeafletMapComponent
  initialLat={28.7041}                    // Starting latitude
  initialLng={77.1025}                    // Starting longitude
  onLocationSelect={(location) => {}}     // Callback on location confirm
  referenceLocation={{lat, lng}}          // Optional reference point
  showDistance={true}                     // Show distance calculation
  height={400}                            // Map height in pixels
  zoomLevel={13}                          // Initial zoom level
/>
```

### 3. **Component: `src/components/LeafletLocationModal.jsx`**
   - Enhanced location modal using Leaflet
   - Replaces the existing Google Maps-based LocationModal
   - Features search + map views
   - Integrates with LocationContext

### 4. **Component: `src/components/DistanceCalculatorDemo.jsx`**
   - Demo component showing all features
   - Reference implementation
   - Good for testing and learning

---

## Integration Steps

### Step 1: Replace LocationModal in App.jsx

**Current (in your App.jsx):**
```javascript
import LocationModal from './components/LocationModal';
```

**New:**
```javascript
import LeafletLocationModal from './components/LeafletLocationModal';
```

Then replace in JSX:
```javascript
{/* OLD */}
<LocationModal />

{/* NEW */}
<LeafletLocationModal />
```

### Step 2: Install/Verify Leaflet Dependencies

Leaflet should already be installed. Verify in `package.json`:
```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^5.0.0"
}
```

If not installed:
```bash
npm install leaflet react-leaflet
```

### Step 3: Update your HTML (if using old Leaflet link)

Check your `index.html` and ensure Leaflet CSS is loaded:
```html
<link 
  rel="stylesheet" 
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>
```

### Step 4: Add Leaflet CSS to your main CSS file (optional)

Add to `src/index.css`:
```css
/* Leaflet Map Customization */
.leaflet-container {
  z-index: 400;
  font-family: inherit;
}

.leaflet-popup-content-wrapper {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.marker-center {
  filter: hue-rotate(0deg) brightness(1);
}

.marker-reference {
  filter: hue-rotate(240deg) brightness(0.9);
}
```

---

## Usage Examples

### Example 1: Using Distance Calculator in a Component

```javascript
import { calculateDistance, estimateDeliveryTime } from '../utils/distanceCalculator';

function DeliveryEstimator() {
  const userLat = 28.7041;
  const userLng = 77.1025;
  const warehouseLat = 28.6692;
  const warehouseLng = 77.4538;

  const distance = calculateDistance(userLat, userLng, warehouseLat, warehouseLng);
  const timeEstimate = estimateDeliveryTime(distance);

  return (
    <div>
      <p>Distance: {distance} km</p>
      <p>Estimated Delivery: {timeEstimate.formatted}</p>
    </div>
  );
}
```

### Example 2: Using LeafletMapComponent

```javascript
import LeafletMapComponent from '../components/LeafletMapComponent';

function LocationPicker() {
  const handleLocationSelect = (location) => {
    console.log('Selected:', location);
    // {lat, lng, address, distance}
  };

  return (
    <LeafletMapComponent
      initialLat={28.7041}
      initialLng={77.1025}
      onLocationSelect={handleLocationSelect}
      height={500}
    />
  );
}
```

### Example 3: Live Location Tracking

```javascript
import { watchUserLocation, stopWatchingLocation } from '../utils/distanceCalculator';
import { useState, useEffect } from 'react';

function LiveTracker() {
  const [location, setLocation] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    watchIdRef.current = watchUserLocation(
      (position) => {
        console.log('Current position:', position);
        setLocation(position);
      },
      (error) => {
        console.error('Tracking error:', error);
      }
    );

    return () => {
      if (watchIdRef.current) {
        stopWatchingLocation(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div>
      {location && (
        <p>
          Latitude: {location.lat}, Longitude: {location.lng}
          <br />
          Accuracy: {location.accuracy.toFixed(2)}m
          <br />
          Speed: {location.speed ? location.speed.toFixed(2) + ' m/s' : 'N/A'}
        </p>
      )}
    </div>
  );
}
```

### Example 4: Show Distance Between Two Locations

```javascript
import LeafletMapComponent from '../components/LeafletMapComponent';

function DistanceViewer() {
  const deliveryPoint = { lat: 28.7041, lng: 77.1025 };
  const warehousePoint = { lat: 28.6692, lng: 77.4538 };

  return (
    <LeafletMapComponent
      initialLat={deliveryPoint.lat}
      initialLng={deliveryPoint.lng}
      referenceLocation={warehousePoint}
      showDistance={true}
      height={400}
    />
  );
}
```

---

## Features & Capabilities

### Location Fetching
✅ Browser Geolocation API integration
✅ High accuracy mode enabled
✅ Fallback to approximate location
✅ Error handling with user-friendly messages
✅ Permission status checking

### Distance Calculation
✅ Haversine formula for accuracy
✅ Support for kilometers and miles
✅ Real-time calculation on map movement
✅ Visual line overlay between points
✅ Sub-kilometer precision (2 decimal places)

### Map Features
✅ OpenStreetMap tiles (free, no API key needed)
✅ Interactive map with click-to-select
✅ Drag marker to adjust position
✅ Zoom in/out controls
✅ Recenter button for GPS
✅ Distance visualization with polyline
✅ Mobile-responsive design

### Delivery Estimation
✅ Automatic calculation based on distance
✅ Configurable average speed (default: 40 km/h)
✅ Time in hours + minutes format
✅ Total minutes for API submissions

### Advanced Features
✅ Live location tracking
✅ Search location by address
✅ Reverse geocoding (coords → address)
✅ Multiple location markers
✅ Address parsing and validation

---

## API Integration Points

### If You Have a Backend Geocoding Service:

Replace the OpenStreetMap calls with your backend:

```javascript
// In distanceCalculator.js, modify geocodeAddress:
export const geocodeAddress = async (address) => {
  const response = await fetch('/api/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });
  
  const data = await response.json();
  return { lat: data.latitude, lng: data.longitude, displayName: data.address };
};
```

### Using Search Locations from Your Backend:

The LeafletLocationModal already integrates with your existing `searchLocations` API:

```javascript
const results = await searchLocations(query);  // Uses your backend
```

---

## Customization Options

### Change Default Center Location

In `LeafletMapComponent.jsx` or `LeafletLocationModal.jsx`:
```javascript
// For Delhi, India (current default)
initialLat = 28.7041
initialLng = 77.1025

// Change to your city, e.g., Mumbai
initialLat = 19.0760
initialLng = 72.8777
```

### Change Average Delivery Speed

In `distanceCalculator.js`, modify `estimateDeliveryTime`:
```javascript
const avgSpeed = 50; // Change from 40 to 50 km/h
```

### Customize Map Tile Provider

In `LeafletMapComponent.jsx`:
```javascript
// Current: OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')

// Alternative: CartoDB
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png')

// Alternative: Stamen
L.tileLayer('https://tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png')
```

### Customize Marker Colors

Create custom icons in `LeafletMapComponent.jsx`:
```javascript
const userMarkerIcon = L.icon({
  iconUrl: 'path/to/custom-marker.png',
  iconSize: [35, 45],
  iconAnchor: [17, 45],
  popupAnchor: [0, -40]
});
```

---

## Performance Optimization

### Lazy Load Map Library
```javascript
const LeafletMap = React.lazy(() => import('./components/LeafletMapComponent'));

// Then use with Suspense
<Suspense fallback={<div>Loading map...</div>}>
  <LeafletMap />
</Suspense>
```

### Debounce Location Searches
Already implemented in `LeafletLocationModal.jsx` with 300ms debounce.

### Stop Watching When Not Needed
```javascript
// Always clean up watches to save battery
useEffect(() => {
  return () => {
    if (watchIdRef.current) {
      stopWatchingLocation(watchIdRef.current);
    }
  };
}, []);
```

---

## Troubleshooting

### Issue: Markers not showing
**Solution:** Make sure Leaflet CSS is loaded in `index.html`

### Issue: Map not responding to clicks
**Solution:** Check z-index conflicts in your CSS. Leaflet should have `z-index: 400` at minimum

### Issue: Geolocation not working
**Solution:** 
- HTTPS is required for Geolocation API (localhost works in dev)
- Check browser permissions for location access
- Use the search view as fallback

### Issue: Distance calculations are wrong
**Solution:** Verify coordinates are in correct format (lat, lng) with valid ranges:
- Latitude: -90 to 90
- Longitude: -180 to 180

### Issue: Map is zoomed too far/close
**Solution:** Adjust the `zoomLevel` prop (1-19 scale, 13 is typical urban level)

---

## Testing the Features

### Quick Test: Use the Demo Component

Add to any page temporarily:
```javascript
import DistanceCalculatorDemo from './components/DistanceCalculatorDemo';

export default function TestPage() {
  return <DistanceCalculatorDemo />;
}
```

### Test Geolocation
1. Open DevTools (F12)
2. Go to Sensors tab
3. Set custom location
4. Click "Get My Location" button

### Test Distance Calculation
1. Click "Get My Location" to set point A
2. Click on map to set point B
3. Distance should automatically calculate
4. Verify against Google Maps distance tool

---

## Next Steps

1. ✅ Replace `LocationModal` with `LeafletLocationModal` in App.jsx
2. ✅ Test geolocation permissions in your browser
3. ✅ Verify Leaflet CSS is loaded
4. ✅ Test the distance calculator with multiple locations
5. ✅ Customize default locations and styles
6. ✅ Add distance display to checkout/delivery pages
7. ✅ Integrate live tracking for delivery tracking features

---

## Support & Questions

For more information on Leaflet: https://leafletjs.com/
For more on Haversine formula: https://en.wikipedia.org/wiki/Haversine_formula
For Geolocation API: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API

