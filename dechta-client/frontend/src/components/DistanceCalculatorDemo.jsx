import React, { useState } from 'react';
import { MapPin, Navigation, Zap } from 'lucide-react';
import LeafletMapComponent from './LeafletMapComponent';
import {
    calculateDistance,
    kmToMiles,
    estimateDeliveryTime,
    getCurrentLocation
} from '../utils/distanceCalculator';

/**
 * Distance Calculator Demo Component
 * 
 * Shows how to use the distance calculation utilities
 * Features:
 * - Display two locations on map
 * - Calculate real distance between them
 * - Show estimated delivery time
 * - Live tracking example
 */
export default function DistanceCalculatorDemo() {
    const [userLocation, setUserLocation] = useState({ lat: 28.7041, lng: 77.1025 });
    const [referenceLocation, setReferenceLocation] = useState({
        lat: 28.6692,
        lng: 77.4538
    });
    const [distance, setDistance] = useState(null);
    const [deliveryTime, setDeliveryTime] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleLocationSelect = (location) => {
        setUserLocation({
            lat: location.lat,
            lng: location.lng
        });

        // Calculate distance
        const dist = calculateDistance(
            location.lat,
            location.lng,
            referenceLocation.lat,
            referenceLocation.lng
        );
        setDistance(parseFloat(dist));

        // Calculate delivery time
        const time = estimateDeliveryTime(dist);
        setDeliveryTime(time);
    };

    const handleGetMyLocation = async () => {
        setLoading(true);
        try {
            const location = await getCurrentLocation();
            handleLocationSelect(location);
        } catch (err) {
            alert('Failed to get location: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Zap className="w-6 h-6 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-900">Distance Calculator</h1>
                    </div>
                    <p className="text-gray-600">
                        Calculate real distances and estimate delivery times using Leaflet maps
                    </p>
                </div>

                {/* Main Content */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Map */}
                    <div className="col-span-full">
                        <LeafletMapComponent
                            initialLat={userLocation.lat}
                            initialLng={userLocation.lng}
                            onLocationSelect={handleLocationSelect}
                            referenceLocation={referenceLocation}
                            showDistance={true}
                            height={400}
                            zoomLevel={12}
                        />
                    </div>

                    {/* Info Cards */}
                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-gray-900">Your Location</h3>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold">Latitude:</span> {userLocation.lat.toFixed(6)}
                            </p>
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold">Longitude:</span> {userLocation.lng.toFixed(6)}
                            </p>
                            {distance && (
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold">Distance from reference:</span>{' '}
                                    <span className="text-lg font-bold text-green-600">{distance} km</span>
                                    <span className="text-gray-500 ml-2">({kmToMiles(distance)} miles)</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                        <div className="flex items-center gap-2 mb-4">
                            <Navigation className="w-5 h-5 text-purple-600" />
                            <h3 className="font-bold text-gray-900">Delivery Estimate</h3>
                        </div>
                        <div className="space-y-2">
                            {deliveryTime ? (
                                <>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold">Estimated Time:</span>
                                    </p>
                                    <p className="text-2xl font-bold text-purple-600">{deliveryTime.formatted}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Based on average speed of 40 km/h
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        ({deliveryTime.totalMinutes} minutes total)
                                    </p>
                                </>
                            ) : (
                                <p className="text-gray-500 text-sm">Select a location to see delivery time</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={handleGetMyLocation}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 font-semibold transition shadow-md"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin">
                                <Navigation className="w-5 h-5" />
                            </div>
                            Getting your location...
                        </>
                    ) : (
                        <>
                            <Navigation className="w-5 h-5" />
                            Get My Current Location
                        </>
                    )}
                </button>

                {/* Usage Instructions */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        How to Use
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-700">
                        <li className="flex gap-3">
                            <span className="font-bold text-blue-600 flex-shrink-0">1.</span>
                            <span>Click the "Get My Current Location" button to fetch your GPS coordinates</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-blue-600 flex-shrink-0">2.</span>
                            <span>Click on the map to select a custom location</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-blue-600 flex-shrink-0">3.</span>
                            <span>The distance is automatically calculated using the Haversine formula</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-blue-600 flex-shrink-0">4.</span>
                            <span>Delivery time is estimated based on 40 km/h average speed</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-bold text-blue-600 flex-shrink-0">5.</span>
                            <span>Use live tracking to update your location in real-time</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
