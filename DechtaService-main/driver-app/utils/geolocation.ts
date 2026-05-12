import { isWeb } from './platform';

let Location: any = null;

// Only require expo-location on mobile
if (!isWeb) {
  try {
    Location = require('expo-location');
  } catch (e) {
    console.warn('expo-location not available');
  }
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface LocationSubscription {
  remove: () => void;
}

/**
 * Request location permission (web uses HTML5, mobile uses expo-location)
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  if (isWeb) {
    // Browser geolocation doesn't require explicit permission request
    // Permission is requested when getCurrentPosition is called
    return true;
  }

  if (!Location) {
    console.warn('Location not available');
    return false;
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Get current position (web or mobile)
 */
export const getCurrentPosition = async (): Promise<LocationCoords | null> => {
  if (isWeb) {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation not available in browser');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || undefined,
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  if (!Location) {
    console.warn('Location not available');
    return null;
  }

  try {
    const result = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      accuracy: result.coords.accuracy || undefined,
      altitude: result.coords.altitude || undefined,
      heading: result.coords.heading || undefined,
      speed: result.coords.speed || undefined,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

/**
 * Watch position changes (web or mobile)
 */
export const watchPositionAsync = (
  callback: (location: LocationCoords) => void,
  onError?: (error: any) => void
): LocationSubscription => {
  if (isWeb) {
    if (!navigator.geolocation) {
      console.warn('Geolocation not available in browser');
      return { remove: () => {} };
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || undefined,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
        });
      },
      (error) => {
        console.error('Geolocation watch error:', error);
        if (onError) onError(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return {
      remove: () => {
        navigator.geolocation.clearWatch(watchId);
      },
    };
  }

  // Mobile implementation using expo-location
  let subscription: any = null;

  (async () => {
    if (!Location) {
      console.warn('Location not available');
      return;
    }

    try {
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
        },
        (location: any) => {
          callback({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
          });
        }
      );
    } catch (error) {
      console.error('Error watching position:', error);
      if (onError) onError(error);
    }
  })();

  return {
    remove: () => {
      if (subscription) {
        subscription.remove();
      }
    },
  };
};
