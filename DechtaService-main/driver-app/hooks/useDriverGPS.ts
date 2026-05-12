import { useState, useEffect } from 'react';
import { watchPositionAsync, requestLocationPermission, LocationSubscription } from '../utils/geolocation';

// Define exactly what the hook returns so TS doesn't complain
interface GPSData {
    location: [number, number];
    gpsError: string | null;
}

export default function useDriverGPS(driverMobile: string | undefined | null, isOnline: boolean): GPSData {
    // Default mock location (Chennai)
    const [location, setLocation] = useState<[number, number]>([13.0827, 80.2707]); 
    const [gpsError, setGpsError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true; 
        let locationSubscription: LocationSubscription | null = null;

        const startLocationTracking = async () => {
            // Do not track if offline or missing mobile number
            if (!isOnline || !driverMobile) return;

            try {
                // Request permissions safely (works on both web and mobile)
                const hasPermission = await requestLocationPermission();
                if (!hasPermission) {
                    if (isMounted) setGpsError("Location permission denied. Please enable it in settings.");
                    return;
                }

                // Start watching position
                const sub = watchPositionAsync(
                    (coords) => {
                        if (isMounted && coords) {
                            const { latitude, longitude } = coords;
                            setLocation([latitude, longitude]);
                            
                            // Clear any previous errors if successful
                            setGpsError(null); 

                            // --- BACKEND LOGIC ---
                            // Driver location updates are sent via driver API endpoint
                        }
                    },
                    (error) => {
                        if (isMounted) {
                            console.error('GPS tracking error:', error);
                            setGpsError('GPS tracking failed');
                        }
                    }
                );

                // Safely assign or remove the subscription depending on component lifecycle
                if (isMounted) {
                    locationSubscription = sub;
                } else {
                    sub.remove();
                }

            } catch (error: any) { 
                if (isMounted) setGpsError(error.message || "Failed to get location");
            }
        };

        startLocationTracking();

        // Cleanup function when the driver goes offline or leaves the page
        return () => {
            isMounted = false;
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, [isOnline, driverMobile]);

    return { location, gpsError };
}