# Leaflet Map Features - Quick Reference

## 🎯 Essential Imports

```javascript
// Distance & Location Utilities
import {
  calculateDistance,        // Get distance between two points
  kmToMiles,               // Convert km to miles
  estimateDeliveryTime,    // Estimate delivery time
  getCurrentLocation,      // Get user's current location
  watchUserLocation,       // Start real-time location tracking
  stopWatchingLocation,    // Stop location tracking
  geocodeAddress,          // Address → Coordinates
  reverseGeocodeCoordinates, // Coordinates → Address
  isWithinBounds           // Check if coords are in bounds
} from '../utils/distanceCalculator';

// Map Components
import LeafletMapComponent from '../components/LeafletMapComponent';
import LeafletLocationModal from '../components/LeafletLocationModal';
import DistanceCalculatorDemo from '../components/DistanceCalculatorDemo';
```

---

## 🚀 Quick API Reference

### Distance Calculation
```javascript
// Basic distance calculation
calculateDistance(lat1, lon1, lat2, lon2)
// Returns: "25.32" (string, in km)

// Convert units
kmToMiles(25.32)              // Returns: "15.73" miles
metersToKm(1000)              // Returns: "1.00" km
```

### Delivery Time
```javascript
estimateDeliveryTime(distanceKm)
// Returns: {
//   hours: 0,
//   minutes: 38,
//   totalMinutes: 38,
//   formatted: "38m"
// }
```

### Location Fetching
```javascript
// Get current location once
const location = await getCurrentLocation();
// Returns: { lat: 28.7041, lng: 77.1025, accuracy: 50 }

// Watch location continuously
const watchId = watchUserLocation(
  (position) => {
    console.log('Lat:', position.lat, 'Lng:', position.lng);
    console.log('Accuracy:', position.accuracy, 'meters');
    console.log('Speed:', position.speed, 'm/s');
  },
  (error) => console.error('Error:', error.message)
);

// Stop watching
stopWatchingLocation(watchId);
```

### Geocoding
```javascript
// Address to Coordinates
const coords = await geocodeAddress("India Gate, New Delhi");
// Returns: { lat: 28.6128, lng: 77.2263, displayName: "..." }

// Coordinates to Address
const address = await reverseGeocodeCoordinates(28.7041, 77.1025);
// Returns: {
//   street: "Some Road",
//   city: "New Delhi",
//   state: "Delhi",
//   zip: "110001",
//   lat: 28.7041,
//   lng: 77.1025,
//   displayName: "..."
// }
```

### Location Bounds
```javascript
isWithinBounds(lat, lng, {
  minLat: 28.4,
  maxLat: 29.0,
  minLng: 77.0,
  maxLng: 77.5
});
// Returns: true/false
```

---

## 🗺️ Component Props

### LeafletMapComponent
```javascript
<LeafletMapComponent
  initialLat={28.7041}                    // Default: 28.7041 (Delhi)
  initialLng={77.1025}                    // Default: 77.1025 (Delhi)
  onLocationSelect={(location) => {       // Required callback
    console.log(location);
    // location: {lat, lng, address, distance}
  }}
  referenceLocation={{                    // Optional: show second marker
    lat: 28.6692,
    lng: 77.4538
  }}
  showDistance={true}                     // Show distance line/calc
  height={400}                            // Map height in pixels
  zoomLevel={13}                          // Map zoom (1-19)
/>
```

### LeafletLocationModal
```javascript
<LeafletLocationModal />
// Automatically integrated with LocationContext
// Returns: updates LocationContext.deliveryAddress
```

---

## 💻 Common Use Cases

### Use Case 1: Show Distance in Order Summary
```javascript
import { calculateDistance } from '../utils/distanceCalculator';

function OrderSummary({ userLocation, warehouseLocation }) {
  const distance = calculateDistance(
    userLocation.lat, userLocation.lng,
    warehouseLocation.lat, warehouseLocation.lng
  );
  
  return <p>Distance: {distance} km</p>;
}
```

### Use Case 2: Display Delivery Time Estimate
```javascript
import { estimateDeliveryTime } from '../utils/distanceCalculator';

function DeliveryEstimate({ distanceKm }) {
  const estimate = estimateDeliveryTime(distanceKm);
  return <p>Estimated: {estimate.formatted}</p>;
}
```

### Use Case 3: Interactive Location Selector
```javascript
import LeafletMapComponent from '../components/LeafletMapComponent';

function LocationSelector() {
  const handleSelect = (location) => {
    console.log('User selected:', location);
    saveToDatabase(location);
  };
  
  return (
    <LeafletMapComponent
      onLocationSelect={handleSelect}
      height={500}
    />
  );
}
```

### Use Case 4: Real-time Delivery Tracking
```javascript
import { watchUserLocation, stopWatchingLocation } from '../utils/distanceCalculator';

function DeliveryTracker() {
  const watchIdRef = useRef(null);
  
  useEffect(() => {
    watchIdRef.current = watchUserLocation(
      (position) => {
        // Update delivery location on map
        updateDeliveryMarker(position.lat, position.lng);
      },
      (error) => console.error(error)
    );
    
    return () => {
      if (watchIdRef.current) {
        stopWatchingLocation(watchIdRef.current);
      }
    };
  }, []);
  
  return <DeliveryMap />;
}
```

### Use Case 5: Zone-based Delivery
```javascript
import { isWithinBounds } from '../utils/distanceCalculator';

function CheckDeliveryZone({ userLat, userLng }) {
  const serviceZone = {
    minLat: 28.4,
    maxLat: 29.0,
    minLng: 77.0,
    maxLng: 77.5
  };
  
  const withinZone = isWithinBounds(userLat, userLng, serviceZone);
  
  return (
    <div>
      {withinZone ? (
        <p>✅ We deliver to your area</p>
      ) : (
        <p>❌ Outside delivery zone</p>
      )}
    </div>
  );
}
```

---

## 🎨 Styling & Customization

### Change Default Location
```javascript
// In LeafletMapComponent.jsx or LeafletLocationModal.jsx
const initialLat = 19.0760;  // Mumbai
const initialLng = 72.8777;

// Or get from partner locations
const PARTNER_LOCATIONS = {
  delhi: { lat: 28.7041, lng: 77.1025 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.3850, lng: 78.4867 }
};
```

### Change Map Tiles
```javascript
// In LeafletMapComponent.jsx
// OpenStreetMap (default - fast, good detail)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')

// CartoDB Light (clean, minimal)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png')

// CartoDB Dark (night mode)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png')

// Stamen (unique style)
L.tileLayer('https://tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png')
```

### Custom Marker Colors
```javascript
// In LeafletMapComponent.jsx
const customIcon = L.icon({
  iconUrl: 'path/to/icon.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  className: 'custom-marker'
});

// Apply to marker
L.marker([lat, lng], { icon: customIcon })
```

---

## 🧪 Testing & Debugging

### Test Location with Mock Data
```javascript
// Bypass geolocation API
const mockLocation = {
  lat: 28.7041,
  lng: 77.1025,
  accuracy: 50
};

// Use directly instead of getCurrentLocation()
handleLocationUpdate(mockLocation);
```

### Debug Distance Calculation
```javascript
const lat1 = 28.7041, lng1 = 77.1025;  // Delhi
const lat2 = 19.0760, lng2 = 72.8777;  // Mumbai

const distance = calculateDistance(lat1, lng1, lat2, lng2);
console.log('Distance:', distance, 'km');
console.log('In miles:', kmToMiles(distance), 'mi');
console.log('Delivery time:', estimateDeliveryTime(distance));

// Expected: ~1400 km, ~15 hours delivery
```

### Verify Leaflet in Console
```javascript
window.L                                // Leaflet object
window.L.map                            // Map constructor
window.L.marker                         // Marker constructor
```

### Check Geolocation Support
```javascript
if (navigator.geolocation) {
  console.log('✅ Geolocation supported');
} else {
  console.log('❌ Geolocation not supported');
}
```

---

## ⚡ Performance Tips

### Reduce Update Frequency
```javascript
// In watchUserLocation, increase maximumAge
const options = {
  enableHighAccuracy: true,
  maximumAge: 10000,  // Update every 10 seconds instead of 5
  timeout: 10000
};
```

### Debounce Map Updates
```javascript
import { debounce } from 'lodash';

const debouncedUpdate = debounce((position) => {
  updateDeliveryMarker(position.lat, position.lng);
}, 1000);  // Update at most once per second
```

### Lazy Load Map Component
```javascript
const LazyLeafletMap = React.lazy(() => 
  import('../components/LeafletMapComponent')
);

// Usage with Suspense
<Suspense fallback={<div>Loading map...</div>}>
  <LazyLeafletMap />
</Suspense>
```

---

## 🚨 Error Handling

### Handle Geolocation Errors
```javascript
try {
  const location = await getCurrentLocation();
} catch (error) {
  if (error.code === error.PERMISSION_DENIED) {
    console.error('User denied geolocation');
  } else if (error.code === error.POSITION_UNAVAILABLE) {
    console.error('Location unavailable');
  } else if (error.code === error.TIMEOUT) {
    console.error('Request timed out');
  }
}
```

### Validate Coordinates
```javascript
function isValidCoordinate(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

if (!isValidCoordinate(lat, lng)) {
  throw new Error('Invalid coordinates');
}
```

### Handle Geocoding Failures
```javascript
try {
  const coordinates = await geocodeAddress(userInput);
} catch (error) {
  if (error.message === 'Address not found') {
    showMessage('Please enter a valid address');
  } else {
    showMessage('Geocoding service temporarily unavailable');
  }
}
```

---

## 📊 Default Values

```javascript
// Default location (Delhi, India)
const DEFAULT_LAT = 28.7041;
const DEFAULT_LNG = 77.1025;

// Default zoom level (city level)
const DEFAULT_ZOOM = 13;

// Default map height
const DEFAULT_MAP_HEIGHT = 400;

// Default average delivery speed (km/h)
const DEFAULT_SPEED = 40;

// Default geolocation options
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
};

// Coordinate ranges
const LAT_RANGE = [-90, 90];
const LNG_RANGE = [-180, 180];
```

---

## 🔗 Related Resources

- **Full Guide**: `LEAFLET_INTEGRATION_GUIDE.md`
- **Implementation Status**: `LEAFLET_IMPLEMENTATION_SUMMARY.md`
- **Checklist**: `LEAFLET_IMPLEMENTATION_CHECKLIST.md`
- **Leaflet Docs**: https://leafletjs.com/reference.html
- **MDN Geolocation**: https://mdn.io/geolocation
- **OpenStreetMap**: https://www.openstreetmap.org/

---

## 💬 Key Takeaways

1. **All utilities are in** `distanceCalculator.js` - use anywhere
2. **Map component is reusable** - pass props for customization
3. **Location modal is ready** - already integrated in App.jsx
4. **No API keys needed** - uses free services (OSM, Nominatim)
5. **Fully documented** - check inline comments in components
6. **Production ready** - tested and optimized

---

**Last Updated:** April 11, 2026  
**Status:** ✅ Production Ready

