'use strict';

// ─────────────────────────────────────────────────────────────
// ETA Service — uses GCP Routes API v2
// Falls back to a time-estimate based on haversine distance if
// the API key is missing or the request fails.
// ─────────────────────────────────────────────────────────────

const ROUTES_API_URL =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

// Average speed assumptions for fallback (km/h)
const AVG_SPEED_KMH = 30;

// ─────────────────────────────────────────────────────────────
// haversine — straight-line distance in km
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
// getEtaSeconds(originLat, originLng, destLat, destLng)
// Returns estimated travel time in seconds.
// ─────────────────────────────────────────────────────────────
async function getEtaSeconds(originLat, originLng, destLat, destLng) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey && apiKey !== 'your_google_maps_api_key_here') {
    try {
      const body = {
        origin: {
          location: { latLng: { latitude: originLat, longitude: originLng } },
        },
        destination: {
          location: { latLng: { latitude: destLat, longitude: destLng } },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        languageCode: 'en-IN',
        units: 'METRIC',
      };

      const response = await fetch(ROUTES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'X-Goog-Api-Key':    apiKey,
          'X-Goog-FieldMask':  'routes.duration,routes.distanceMeters',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      const durationStr = data?.routes?.[0]?.duration; // e.g. "1800s"
      if (durationStr) {
        return parseInt(durationStr.replace('s', ''), 10);
      }
    } catch (e) {
      console.warn('[ETA] GCP Routes API failed, using haversine fallback:', e.message);
    }
  }

  // ── Fallback: distance / speed ──────────────────────────────
  const km      = haversineKm(originLat, originLng, destLat, destLng);
  const seconds = Math.round((km / AVG_SPEED_KMH) * 3600);
  console.log(`[ETA] Fallback — ${km.toFixed(1)} km → ~${Math.round(seconds / 60)} min`);
  return seconds;
}

// ─────────────────────────────────────────────────────────────
// formatEta(dispatchTime, travelSeconds)
// Returns an ISO string for the estimated arrival time.
// ─────────────────────────────────────────────────────────────
function formatEta(dispatchTime, travelSeconds) {
  const base = dispatchTime ? new Date(dispatchTime) : new Date();
  // Add a 15-minute preparation buffer + travel time
  const prepSeconds = 15 * 60;
  const arrivalMs   = base.getTime() + (prepSeconds + travelSeconds) * 1000;
  return new Date(arrivalMs).toISOString();
}

module.exports = { getEtaSeconds, formatEta };
