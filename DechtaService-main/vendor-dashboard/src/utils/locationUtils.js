import { VENDOR_API_BASE } from '../api/apiBase';

const IS_NGROK_API = /https:\/\/[a-z0-9-]+\.ngrok(-free)?\.dev/i.test(VENDOR_API_BASE);
const NGROK_HEADERS = IS_NGROK_API ? { 'ngrok-skip-browser-warning': 'true' } : {};

export const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        const msg =
          error?.code === 1
            ? 'Location permission denied.'
            : error?.code === 2
            ? 'Unable to determine your location.'
            : error?.code === 3
            ? 'Location request timed out.'
            : 'Unable to get current location.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });

export const reverseGeocodeCoordinates = async (lat, lng) => {
  const qLat = Number(lat).toFixed(6);
  const qLng = Number(lng).toFixed(6);

  try {
    const response = await fetch(
      `${VENDOR_API_BASE}/location/reverse-geocode?lat=${encodeURIComponent(qLat)}&lng=${encodeURIComponent(qLng)}`,
      { headers: NGROK_HEADERS }
    );
    if (!response.ok) throw new Error('API reverse geocode failed');
    const payload = await response.json();
    const data = payload?.data || payload;

    return {
      area: data.area || data.street || '',
      city: data.city || '',
      state: data.state || '',
      pincode: data.zip || '',
      displayName: data.formatted || `${qLat}, ${qLng}`,
    };
  } catch {
    const fallback = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(qLat)}&lon=${encodeURIComponent(qLng)}`
    );
    if (!fallback.ok) throw new Error('Reverse geocoding failed.');
    const raw = await fallback.json();
    const addr = raw?.address || {};

    return {
      area: addr.suburb || addr.neighbourhood || addr.road || addr.hamlet || '',
      city: addr.city || addr.town || addr.village || addr.county || '',
      state: addr.state || '',
      pincode: addr.postcode || '',
      displayName: raw?.display_name || `${qLat}, ${qLng}`,
    };
  }
};
