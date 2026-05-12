'use strict';

// ─────────────────────────────────────────────────────────────
// Haversine distance in km (used when Google Maps key unavailable)
// ─────────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────
// Google Distance Matrix API (returns km between two points)
// Falls back to haversine if API key is missing / request fails
// ─────────────────────────────────────────────────────────────
async function getDistanceKm(originLat, originLng, destLat, destLng) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey && apiKey !== 'your_google_maps_api_key_here') {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/distancematrix/json` +
        `?origins=${originLat},${originLng}` +
        `&destinations=${destLat},${destLng}` +
        `&mode=driving` +
        `&key=${apiKey}`;

      const response = await fetch(url);
      const data     = await response.json();

      const element = data?.rows?.[0]?.elements?.[0];
      if (element?.status === 'OK' && element.distance?.value) {
        // distance.value is in metres
        return parseFloat((element.distance.value / 1000).toFixed(2));
      }
    } catch (e) {
      console.warn('[PRICING] Google Distance Matrix failed, using haversine fallback:', e.message);
    }
  }

  // Fallback to haversine formula
  return parseFloat(haversineKm(originLat, originLng, destLat, destLng).toFixed(2));
}

module.exports = { haversineKm, getDistanceKm };
