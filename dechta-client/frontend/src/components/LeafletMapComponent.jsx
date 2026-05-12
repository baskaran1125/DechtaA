import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Crosshair, AlertCircle } from 'lucide-react';
import {
    calculateDistance,
    reverseGeocodeCoordinates,
    getCurrentLocation,
    watchUserLocation,
    stopWatchingLocation,
    getGeolocationErrorMessage
} from '../utils/distanceCalculator';

// Fix Leaflet marker icons for Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconShadow from 'leaflet/dist/images/marker-shadow.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIconRetina,
    shadowUrl: markerIconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

/**
 * LeafletMap Component
 * Interactive map for location selection with real-time distance calculation
 * 
 * Props:
 *   - initialLat: Initial latitude (default: center of mapped area)
 *   - initialLng: Initial longitude
 *   - onLocationSelect: Callback when location is selected {lat, lng, address}
 *   - referenceLocation: Reference point {lat, lng} for distance calculation (optional)
 *   - showDistance: Show distance to reference location (default: false)
 *   - height: Map height in pixels (default: 400)
 *   - zoomLevel: Initial zoom level (default: 13)
 */
export default function LeafletMap({
    initialLat = 28.7041,
    initialLng = 77.1025, // Default: Delhi, India
    onLocationSelect,
    referenceLocation = null,
    showDistance = false,
    height = 400,
    zoomLevel = 13,
    pinPointMode = false,
    fullScreen = false
}) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const centerMarker = useRef(null);
    const referenceMarker = useRef(null);
    const distanceLine = useRef(null);
    const reverseGeocodeTimerRef = useRef(null);
    const [currentLat, setCurrentLat] = useState(initialLat);
    const [currentLng, setCurrentLng] = useState(initialLng);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [distance, setDistance] = useState(null);
    const [address, setAddress] = useState('');
    const [isInitializing, setIsInitializing] = useState(true);
    const watchId = useRef(null);

    // Initialize map
    useEffect(() => {
        if (map.current) return;

        try {
            map.current = L.map(mapContainer.current).setView([initialLat, initialLng], zoomLevel);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
                maxZoom: 19
            }).addTo(map.current);

            // Add center marker (red pin)
            centerMarker.current = L.marker([initialLat, initialLng], {
                icon: L.icon({
                    iconUrl: markerIcon,
                    iconSize: [35, 45],
                    iconAnchor: [17, 45],
                    popupAnchor: [0, -40],
                    className: 'marker-center'
                })
            })
                .addTo(map.current)
                .bindPopup('Selected Location');

            // Add reference marker if provided
            if (referenceLocation) {
                referenceMarker.current = L.marker(
                    [referenceLocation.lat, referenceLocation.lng],
                    {
                        icon: L.icon({
                            iconUrl: markerIcon,
                            iconSize: [25, 35],
                            iconAnchor: [12, 35],
                            popupAnchor: [0, -30],
                            className: 'marker-reference',
                            opacity: 0.7
                        })
                    }
                )
                    .addTo(map.current)
                    .bindPopup('Reference Location');

                // Draw line between locations
                drawDistanceLine(initialLat, initialLng, referenceLocation.lat, referenceLocation.lng);
            }

            setIsInitializing(false);

            if (!pinPointMode) {
                // Handle map click
                map.current.on('click', (e) => {
                    updateLocation(e.latlng.lat, e.latlng.lng);
                });
            }
        } catch (err) {
            setError('Failed to initialize map');
            console.error('Map initialization error:', err);
        }
    }, [initialLat, initialLng, zoomLevel, pinPointMode, referenceLocation]);

    useEffect(() => {
        if (!map.current || !pinPointMode) return;

        const handleMoveEnd = () => {
            const center = map.current.getCenter();
            updateLocation(center.lat, center.lng, { pan: false });
        };

        map.current.on('moveend', handleMoveEnd);
        return () => {
            if (map.current) {
                map.current.off('moveend', handleMoveEnd);
            }
        };
    }, [pinPointMode]);

    // Fetch address for current coordinates
    useEffect(() => {
        const fetchAddress = async () => {
            try {
                const result = await reverseGeocodeCoordinates(currentLat, currentLng);
                const areaLabel = [result.area, result.city, result.state]
                    .filter(Boolean)
                    .join(', ');
                setAddress(
                    areaLabel ||
                        result.street ||
                        result.displayName ||
                        `${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`
                );
            } catch (err) {
                setAddress(`${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`);
            }
        };

        if (!isInitializing) {
            if (reverseGeocodeTimerRef.current) {
                clearTimeout(reverseGeocodeTimerRef.current);
            }

            reverseGeocodeTimerRef.current = setTimeout(() => {
                fetchAddress();
            }, pinPointMode ? 500 : 250);
        }

        return () => {
            if (reverseGeocodeTimerRef.current) {
                clearTimeout(reverseGeocodeTimerRef.current);
            }
        };
    }, [currentLat, currentLng, isInitializing, pinPointMode]);

    // Calculate and display distance if reference location changes
    useEffect(() => {
        if (referenceLocation && showDistance) {
            const dist = calculateDistance(
                currentLat,
                currentLng,
                referenceLocation.lat,
                referenceLocation.lng
            );
            setDistance(parseFloat(dist));
            drawDistanceLine(currentLat, currentLng, referenceLocation.lat, referenceLocation.lng);
        }
    }, [currentLat, currentLng, referenceLocation, showDistance]);

    const drawDistanceLine = (lat1, lng1, lat2, lng2) => {
        if (!map.current) return;

        if (distanceLine.current) {
            map.current.removeLayer(distanceLine.current);
        }

        distanceLine.current = L.polyline(
            [
                [lat1, lng1],
                [lat2, lng2]
            ],
            {
                color: '#ef4444',
                weight: 2,
                opacity: 0.7,
                dashArray: '5, 5'
            }
        ).addTo(map.current);
    };

    const updateLocation = (lat, lng, options = {}) => {
        const shouldPan = options.pan !== false;
        setCurrentLat(lat);
        setCurrentLng(lng);

        // Update center marker
        if (centerMarker.current) {
            centerMarker.current.setLatLng([lat, lng]);
        }

        // Update map center
        if (map.current && shouldPan) {
            map.current.panTo([lat, lng]);
        }
    };

    const handleGetCurrentLocation = async () => {
        setLoading(true);
        setError(null);
        try {
            const location = await getCurrentLocation({
                minAccuracyMeters: 250,
                maxSampleTimeMs: 15000
            });
            updateLocation(location.lat, location.lng);
            if (location.accuracy > 250) {
                setError(`Location found but accuracy is low (±${Math.round(location.accuracy)}m). Try again in open sky for better precision.`);
            }
        } catch (err) {
            setError(getGeolocationErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmLocation = () => {
        if (onLocationSelect) {
            onLocationSelect({
                lat: currentLat,
                lng: currentLng,
                address,
                distance: distance ? `${distance} km` : null
            });
        }
    };

    const handleStartLiveTracking = () => {
        if (watchId.current !== null) {
            return; // Already tracking
        }

        setLoading(true);
        setError(null);
        watchId.current = watchUserLocation(
            (position) => {
                updateLocation(position.lat, position.lng);
                setLoading(false);
            },
            (err) => {
                setError(getGeolocationErrorMessage(err));
                setLoading(false);
            }
        );

        if (watchId.current === null) {
            setLoading(false);
            setError('Geolocation is not supported in this browser.');
        }
    };

    const handleStopLiveTracking = () => {
        if (watchId.current !== null) {
            stopWatchingLocation(watchId.current);
            watchId.current = null;
        }
    };

    return (
        <div className={`flex flex-col gap-3 ${pinPointMode ? 'h-full min-h-0 pb-2' : ''}`}>
            {/* Map Container */}
            <div
                ref={mapContainer}
                style={{ height: typeof height === 'string' ? height : `${height}px` }}
                className={`relative overflow-hidden ${fullScreen ? 'rounded-none border-none' : 'rounded-lg border border-gray-300'}`}
            >
                {isInitializing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                        <div className="animate-spin">
                            <MapPin className="w-6 h-6 text-red-500" />
                        </div>
                    </div>
                )}

                {pinPointMode && (
                    <div className="pointer-events-none absolute inset-0 z-[450] flex items-center justify-center">
                        <div className="relative -translate-y-4">
                            <MapPin className="w-10 h-10 text-red-600 drop-shadow-md" fill="#ef4444" />
                            <div className="mx-auto h-2 w-2 rounded-full bg-red-700 shadow" />
                        </div>
                    </div>
                )}
            </div>

            {pinPointMode && (
                <div className="-mt-1 text-center text-xs font-medium text-gray-600">
                    Drag map to position pin at your exact location
                </div>
            )}

            {/* Current Location Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700">Current Location</p>
                <p className="text-xs text-gray-600">
                    Latitude: {currentLat.toFixed(6)} | Longitude: {currentLng.toFixed(6)}
                </p>
                {address && <p className="text-sm text-gray-800 font-semibold mt-1">{address}</p>}
                {distance && showDistance && (
                    <p className="text-sm text-green-700 font-medium mt-1">Distance: {distance} km</p>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Control Buttons */}
            <div className={`flex flex-wrap gap-2 ${pinPointMode ? 'sticky bottom-0 z-[460] rounded-xl border border-gray-200 bg-white/95 p-2 shadow-md backdrop-blur' : ''}`}>
                <button
                    onClick={handleGetCurrentLocation}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium transition"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin">
                                <Crosshair className="w-4 h-4" />
                            </div>
                            Locating...
                        </>
                    ) : (
                        <>
                            <Navigation className="w-4 h-4" />
                            Get My Location
                        </>
                    )}
                </button>

                <button
                    onClick={
                        watchId.current ? handleStopLiveTracking : handleStartLiveTracking
                    }
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        watchId.current
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                >
                    <Navigation className="w-4 h-4" />
                    {watchId.current ? 'Stop Tracking' : 'Live Track'}
                </button>

                <button
                    onClick={handleConfirmLocation}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition ml-auto"
                >
                    <MapPin className="w-4 h-4" />
                    Confirm Location
                </button>
            </div>
        </div>
    );
}
