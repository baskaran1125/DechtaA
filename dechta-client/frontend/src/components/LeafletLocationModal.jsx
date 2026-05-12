import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    X,
    Search,
    Navigation,
    ArrowLeft,
    Loader2,
    Map as MapIcon,
    AlertCircle
} from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { searchLocations, fetchPlaceDetails } from '../api/apiClient';
import LeafletMapComponent from './LeafletMapComponent';
import {
    getCurrentLocation,
    getGeolocationErrorMessage,
    geocodeAddress
} from '../utils/distanceCalculator';

export default function LeafletLocationModal() {
    const { locationModalOpen, setLocationModalOpen, setDeliveryAddress } = useLocation();

    // ── View states ───────────────────────────────────────
    const [viewMode, setViewMode] = useState('search'); // 'search' | 'map'

    // ── Search state ──────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchTimeout = useRef(null);

    // ── Map state ─────────────────────────────────────────
    const [mapCenter, setMapCenter] = useState({ lat: 28.7041, lng: 77.1025 }); // Default: Delhi
    const [userCoords, setUserCoords] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [mapLoading, setMapLoading] = useState(false);
    const [error, setError] = useState(null);

    const inputRef = useRef(null);

    const normalizeLocationResults = useCallback((payload) => {
        const rawList = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : [];

        return rawList
            .map((item) => {
                const primary = item.title || item.street || item.display_name || '';
                const secondary = item.subtitle || '';
                const lat = Number(item.lat);
                const lng = Number(item.lon ?? item.lng);

                return {
                    id: item.place_id || `${primary}-${secondary}`,
                    placeId: item.place_id || null,
                    primary,
                    secondary,
                    lat: Number.isFinite(lat) ? lat : null,
                    lng: Number.isFinite(lng) ? lng : null,
                    raw: item
                };
            })
            .filter((item) => item.primary);
    }, []);

    // ── Effects ───────────────────────────────────────────

    useEffect(() => {
        if (!locationModalOpen) {
            setViewMode('search');
        }
    }, [locationModalOpen]);

    // Prevent page scroll behind modal to avoid scroll glitches while interacting with the map.
    useEffect(() => {
        if (!locationModalOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [locationModalOpen]);

    // Focus input on search view
    useEffect(() => {
        if (viewMode === 'search' && locationModalOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [viewMode, locationModalOpen]);

    // Ask for location on modal open to improve search relevance near the user.
    useEffect(() => {
        if (!locationModalOpen) return;

        let active = true;
        getCurrentLocation({ minAccuracyMeters: 300, maxSampleTimeMs: 6000 })
            .then((position) => {
                if (!active) return;
                setUserCoords({ lat: position.lat, lng: position.lng });
                setMapCenter({ lat: position.lat, lng: position.lng });
            })
            .catch(() => {
                // Ignore silently; user can still type and select manually.
            });

        return () => {
            active = false;
        };
    }, [locationModalOpen]);

    // ── Search handlers ───────────────────────────────────

    const handleSearchChange = useCallback((value) => {
        setSearchQuery(value);
        setError(null);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (!value.trim()) {
            setSuggestions([]);
            return;
        }

        setSearchLoading(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const results = await searchLocations(value, userCoords || {});
                setSuggestions(normalizeLocationResults(results));
            } catch (err) {
                setError('Failed to search locations. Please try again.');
                setSuggestions([]);
                console.error('Search error:', err);
            } finally {
                setSearchLoading(false);
            }
        }, 300);

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [normalizeLocationResults, userCoords]);

    const handleSelectSuggestion = async (suggestion) => {
        setMapLoading(true);
        setError(null);
        try {
            let lat = suggestion.lat;
            let lng = suggestion.lng;
            let displayAddress = suggestion.secondary
                ? `${suggestion.primary}, ${suggestion.secondary}`
                : suggestion.primary;
            let details = null;

            if ((lat === null || lng === null) && suggestion.placeId) {
                details = await fetchPlaceDetails(suggestion.placeId);
                const detailsData = details?.data || details;
                if (typeof detailsData?.lat === 'number' && typeof detailsData?.lng === 'number') {
                    lat = detailsData.lat;
                    lng = detailsData.lng;
                }
                if (detailsData?.formatted) {
                    displayAddress = detailsData.formatted;
                }
            }

            if (lat === null || lng === null) {
                const geocoded = await geocodeAddress(
                    suggestion.secondary
                        ? `${suggestion.primary}, ${suggestion.secondary}`
                        : suggestion.primary
                );
                lat = geocoded.lat;
                lng = geocoded.lng;
            }

            const addressParts = {
                street: details?.data?.area || suggestion.primary,
                city: details?.data?.city || suggestion.raw?.city || '',
                state: details?.data?.state || suggestion.raw?.state || '',
                zip: details?.data?.zip || suggestion.raw?.zip || '',
                formatted: displayAddress,
                lat,
                lng
            };

            setSelectedLocation(addressParts);
            setMapCenter({ lat: addressParts.lat, lng: addressParts.lng });
            setViewMode('map');
            setSearchQuery('');
            setSuggestions([]);
        } catch (err) {
            setError('Failed to load location. Please try again.');
            console.error('Selection error:', err);
        } finally {
            setMapLoading(false);
        }
    };

    const handleGetCurrentLocation = async () => {
        setMapLoading(true);
        setError(null);
        try {
            const location = await getCurrentLocation({
                minAccuracyMeters: 120,
                maxSampleTimeMs: 12000
            });
            setUserCoords({ lat: location.lat, lng: location.lng });
            setMapCenter(location);
            setViewMode('map');
            if (location.accuracy > 120) {
                setError(`Location found but accuracy is low (±${Math.round(location.accuracy)}m). Move to open sky and retry for better precision.`);
            }
        } catch (err) {
            setError(getGeolocationErrorMessage(err));
            // Keep the flow moving even when GPS lookup fails.
            setViewMode('map');
        } finally {
            setMapLoading(false);
        }
    };

    // ── Map handler ───────────────────────────────────────

    const handleLocationConfirm = (locationData) => {
        const label = selectedLocation?.formatted || locationData.address || selectedLocation?.street || 'Selected Delivery Location';

        setDeliveryAddress({
            label,
            street: locationData.address,
            city: selectedLocation?.city || '',
            state: selectedLocation?.state || '',
            zip: selectedLocation?.zip || '',
            instructions: '',
            lat: locationData.lat,
            lng: locationData.lng
        });

        setLocationModalOpen(false);
        setViewMode('search');
        setSuggestions([]);
        setSelectedLocation(null);
    };

    // ── Render helpers ───────────────────────────────────

    const renderSearchView = () => (
        <div className="flex h-full flex-col gap-4">
            {/* Search Input */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search location by address..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pl-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />

                {searchLoading && (
                    <Loader2 className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 animate-spin" />
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Get Current Location Button */}
            <button
                onClick={handleGetCurrentLocation}
                disabled={mapLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400"
            >
                {mapLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Locating...
                    </>
                ) : (
                    <>
                        <Navigation className="w-4 h-4" />
                        Use My Current Location
                    </>
                )}
            </button>

            {/* Suggestions List */}
            {suggestions.length > 0 && (
                <div className="flex-1 space-y-2 overflow-y-auto pr-2">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.id || index}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                        >
                            <p className="font-medium text-gray-900 text-sm">
                                {suggestion.primary}
                            </p>
                            {suggestion.secondary ? (
                                <p className="text-xs text-gray-600 mt-1">{suggestion.secondary}</p>
                            ) : null}
                        </button>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!searchLoading && suggestions.length === 0 && searchQuery && (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p className="text-sm">No locations found. Try another search.</p>
                </div>
            )}

            {!searchLoading && searchQuery === '' && (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p className="text-sm">Search for a location or use your current location</p>
                </div>
            )}
        </div>
    );

    const renderMapView = () => (
        <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
                <LeafletMapComponent
                    initialLat={mapCenter.lat}
                    initialLng={mapCenter.lng}
                    onLocationSelect={handleLocationConfirm}
                    height="100%"
                    zoomLevel={15}
                    pinPointMode={true}
                    fullScreen={true}
                />
            </div>
        </div>
    );

    // ── Main render ───────────────────────────────────────

    if (!locationModalOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-white">
            <div className="flex h-full w-full flex-col bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4">
                    <div className="flex items-center gap-2">
                        <MapIcon className="h-5 w-5 text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-900">
                            {viewMode === 'search' ? 'Select Location' : 'Pin Your Exact Location'}
                        </h2>
                    </div>
                    <button
                        onClick={() => setLocationModalOpen(false)}
                        className="rounded-lg p-1 transition hover:bg-gray-100"
                    >
                        <X className="h-5 w-5 text-gray-600" />
                    </button>
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2">
                    <button
                        onClick={() => setViewMode('search')}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                            viewMode === 'search' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-700'
                        }`}
                    >
                        <span className="inline-flex items-center gap-1">
                            <Search className="h-4 w-4" />
                            Search
                        </span>
                    </button>
                    <button
                        onClick={() => setViewMode('map')}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                            viewMode === 'map' ? 'bg-white text-blue-700 shadow' : 'text-gray-600 hover:text-blue-700'
                        }`}
                    >
                        <span className="inline-flex items-center gap-1">
                            <ArrowLeft className="h-4 w-4 rotate-90" />
                            Pinpoint
                        </span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {viewMode === 'search' ? renderSearchView() : renderMapView()}
                </div>
            </div>
        </div>
    );
}
