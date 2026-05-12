/**
 * Distance Calculator Utility
 * Calculates real distances between coordinates using Haversine formula
 * All distances returned in kilometers (can be converted to miles)
 */

const API_BASE_URL = String(import.meta.env.VITE_API_URL || 'http://localhost:5001').trim().replace(/\/+$/, '');
const reverseGeoCache = new Map();

/**
 * Haversine formula to calculate distance between two coordinates
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
};

/**
 * Convert kilometers to miles
 * @param {number} km - Distance in kilometers
 * @returns {number} Distance in miles
 */
export const kmToMiles = (km) => (km * 0.621371).toFixed(2);

/**
 * Convert meters to kilometers
 * @param {number} meters - Distance in meters
 * @returns {number} Distance in kilometers
 */
export const metersToKm = (meters) => (meters / 1000).toFixed(2);

/**
 * Get formatted distance string
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @param {string} unit - 'km' or 'miles' (default: 'km')
 * @returns {string} Formatted distance string
 */
export const getFormattedDistance = (lat1, lon1, lat2, lon2, unit = 'km') => {
    const distanceKm = calculateDistance(lat1, lon1, lat2, lon2);
    if (unit === 'miles') {
        return `${kmToMiles(distanceKm)} miles`;
    }
    return `${distanceKm} km`;
};

/**
 * Estimate delivery time based on distance
 * Uses average speed of 40 km/h for urban areas
 * @param {number} distanceKm - Distance in kilometers
 * @returns {object} Estimated time object {hours, minutes, formatted}
 */
export const estimateDeliveryTime = (distanceKm) => {
    const avgSpeed = 40; // km/h
    const totalMinutes = Math.ceil((parseFloat(distanceKm) / avgSpeed) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    let formatted = '';
    if (hours > 0) {
        formatted += `${hours}h `;
    }
    if (minutes > 0 || formatted === '') {
        formatted += `${minutes}m`;
    }
    
    return { hours, minutes, totalMinutes, formatted };
};

/**
 * Get coordinates from address using Nominatim (OpenStreetMap)
 * Free alternative to Google Maps Geocoding API
 * @param {string} address - Address string to geocode
 * @returns {Promise} Promise with {lat, lng, displayName}
 */
export const geocodeAddress = async (address) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/location/search?q=${encodeURIComponent(address)}`
        );

        if (!response.ok) throw new Error('Geocoding failed');
        const payload = await response.json();
        const list = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

        if (list.length === 0) {
            throw new Error('Address not found');
        }

        const first = list[0];
        return {
            lat: Number(first.lat),
            lng: Number(first.lon ?? first.lng),
            displayName: first.display_name || [first.title, first.subtitle].filter(Boolean).join(', ')
        };
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
};

/**
 * Reverse geocode coordinates to address using Nominatim
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise} Promise with address details
 */
export const reverseGeocodeCoordinates = async (lat, lng) => {
    try {
        const roundedLat = Number(lat).toFixed(5);
        const roundedLng = Number(lng).toFixed(5);
        const cacheKey = `${roundedLat},${roundedLng}`;
        const cached = reverseGeoCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < 120000) {
            return cached.value;
        }

        const response = await fetch(
            `${API_BASE_URL}/api/location/reverse-geocode?lat=${encodeURIComponent(roundedLat)}&lng=${encodeURIComponent(roundedLng)}`
        );

        if (!response.ok) throw new Error('Reverse geocoding failed');
        const payload = await response.json();
        const data = payload?.data || payload;

        const mapped = {
            street: data.area || '',
            area: data.area || '',
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            lat: Number(data.lat ?? lat),
            lng: Number(data.lng ?? lng),
            displayName: data.formatted || `${roundedLat}, ${roundedLng}`
        };

        reverseGeoCache.set(cacheKey, { value: mapped, timestamp: Date.now() });
        return mapped;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        throw error;
    }
};

const GEO_ERROR_MESSAGES = {
    1: 'Location permission was denied. Please allow location access and try again.',
    2: 'Unable to determine your position right now. Please check network/GPS and try again.',
    3: 'Location request timed out. Please try again.'
};

const DEFAULT_MIN_ACCURACY_METERS = 150;
const DEFAULT_MAX_SAMPLE_TIME_MS = 12000;

export const getGeolocationErrorMessage = (error) => {
    if (!error) return 'Unable to access your location at the moment.';
    if (typeof error === 'string') return error;
    if (error.message && !error.code) return error.message;
    return GEO_ERROR_MESSAGES[error.code] || 'Unable to access your location at the moment.';
};

const requestCurrentPosition = (options) =>
    new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

const mapGeoPosition = (position, source = 'gps') => ({
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    source
});

const sampleBestPosition = ({ minAccuracyMeters, maxSampleTimeMs, initialPosition = null }) =>
    new Promise((resolve, reject) => {
        let bestPosition = initialPosition;
        let watchId = null;

        const finalize = () => {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }

            if (!bestPosition) {
                reject(new Error('Unable to determine your position right now.'));
                return;
            }

            resolve(mapGeoPosition(bestPosition));
        };

        const timerId = setTimeout(finalize, maxSampleTimeMs);

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                if (
                    !bestPosition ||
                    position.coords.accuracy < bestPosition.coords.accuracy
                ) {
                    bestPosition = position;
                }

                if (position.coords.accuracy <= minAccuracyMeters) {
                    clearTimeout(timerId);
                    finalize();
                }
            },
            (error) => {
                clearTimeout(timerId);
                if (watchId !== null) {
                    navigator.geolocation.clearWatch(watchId);
                }
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: maxSampleTimeMs,
                maximumAge: 0
            }
        );
    });

/**
 * Get user's current location using Geolocation API
 * @param {object} config - Optional config
 * @param {number} config.minAccuracyMeters - Accuracy target in meters (default: 150)
 * @param {number} config.maxSampleTimeMs - Max sampling time in ms (default: 12000)
 * @returns {Promise} Promise with {lat, lng, accuracy, source}
 */
export const getCurrentLocation = (config = {}) => {
    const minAccuracyMeters =
        typeof config.minAccuracyMeters === 'number'
            ? config.minAccuracyMeters
            : DEFAULT_MIN_ACCURACY_METERS;
    const maxSampleTimeMs =
        typeof config.maxSampleTimeMs === 'number'
            ? config.maxSampleTimeMs
            : DEFAULT_MAX_SAMPLE_TIME_MS;

    return new Promise(async (resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported in this browser.'));
            return;
        }

        if (!window.isSecureContext) {
            reject(new Error('Location requires a secure context (HTTPS or localhost).'));
            return;
        }

        const highAccuracyOptions = {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0
        };

        const lowAccuracyFallbackOptions = {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 300000
        };

        const cachedPositionOptions = {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 86400000
        };

        try {
            const position = await requestCurrentPosition(highAccuracyOptions);
            if (position.coords.accuracy <= minAccuracyMeters) {
                resolve(mapGeoPosition(position));
                return;
            }

            const sampledPosition = await sampleBestPosition({
                minAccuracyMeters,
                maxSampleTimeMs,
                initialPosition: position
            });
            resolve(sampledPosition);
        } catch (primaryError) {
            // Retry without high-accuracy constraints, then refine via sampling.
            if (primaryError?.code === 2 || primaryError?.code === 3) {
                try {
                    const fallbackPosition = await requestCurrentPosition(lowAccuracyFallbackOptions);
                    if (fallbackPosition.coords.accuracy <= minAccuracyMeters) {
                        resolve(mapGeoPosition(fallbackPosition));
                        return;
                    }

                    const sampledPosition = await sampleBestPosition({
                        minAccuracyMeters,
                        maxSampleTimeMs,
                        initialPosition: fallbackPosition
                    });
                    resolve(sampledPosition);
                    return;
                } catch (fallbackError) {
                    try {
                        const cachedPosition = await requestCurrentPosition(cachedPositionOptions);
                        resolve(mapGeoPosition(cachedPosition, 'cached'));
                        return;
                    } catch (cachedError) {
                        reject(new Error(getGeolocationErrorMessage(cachedError)));
                        return;
                    }
                }
            }

            reject(new Error(getGeolocationErrorMessage(primaryError)));
        }
    });
};

/**
 * Watch user's location for real-time updates
 * @param {Function} onSuccess - Callback with location updates
 * @param {Function} onError - Error callback
 * @returns {number} Watch ID for stopping the watch
 */
export const watchUserLocation = (onSuccess, onError) => {
    if (!navigator.geolocation) {
        onError(new Error('Geolocation not supported'));
        return null;
    }
    
    const options = {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
    };
    
    return navigator.geolocation.watchPosition(
        (position) => {
            onSuccess({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading,
                speed: position.coords.speed
            });
        },
        onError,
        options
    );
};

/**
 * Stop watching user's location
 * @param {number} watchId - Watch ID returned from watchUserLocation
 */
export const stopWatchingLocation = (watchId) => {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }
};

/**
 * Validate if coordinates are within bounds
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {object} bounds - Bounds object {minLat, maxLat, minLng, maxLng}
 * @returns {boolean}
 */
export const isWithinBounds = (lat, lng, bounds) => {
    return (
        lat >= bounds.minLat &&
        lat <= bounds.maxLat &&
        lng >= bounds.minLng &&
        lng <= bounds.maxLng
    );
};
