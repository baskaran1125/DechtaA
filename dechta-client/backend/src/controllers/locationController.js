'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok, err }  = require('../utils/response');

const GOOGLE_MAPS_KEY = () => process.env.GOOGLE_MAPS_API_KEY;

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const NOMINATIM_HEADERS = {
  'User-Agent': 'DechtaClient/1.0 (location-search)',
  'Accept-Language': 'en',
};

const safeNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const formatSubtitle = (address = {}) => {
  const parts = [
    address.suburb,
    address.neighbourhood,
    address.city_district,
    address.city || address.town || address.village,
    address.state,
  ].filter(Boolean);
  return parts.join(', ');
};

const getArea = (address = {}) =>
  address.suburb ||
  address.neighbourhood ||
  address.city_district ||
  address.hamlet ||
  address.city ||
  address.town ||
  address.village ||
  '';

const toOsmPlaceId = (item = {}) => `osm:${item.osm_type || ''}:${item.osm_id || ''}`;

const fromOsmPlaceId = (placeId) => {
  const parts = String(placeId || '').split(':');
  if (parts.length !== 3 || parts[0] !== 'osm') return null;
  const osmType = parts[1];
  const osmId = parts[2];

  const prefix = osmType === 'node' ? 'N' : osmType === 'way' ? 'W' : osmType === 'relation' ? 'R' : null;
  if (!prefix || !osmId) return null;

  return `${prefix}${osmId}`;
};

const normalizeNominatimResult = (item = {}) => {
  const lat = safeNum(item.lat);
  const lng = safeNum(item.lon);
  const address = item.address || {};

  return {
    place_id: toOsmPlaceId(item),
    title: getArea(address) || item.name || (item.display_name || '').split(',')[0] || 'Selected Place',
    subtitle: formatSubtitle(address),
    display_name: item.display_name || '',
    area: getArea(address),
    city: address.city || address.town || address.village || '',
    state: address.state || '',
    zip: address.postcode || '',
    lat,
    lng,
  };
};

const nominatimSearch = async (q, lat, lng) => {
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '8');
  url.searchParams.set('q', q);
  url.searchParams.set('countrycodes', 'in');

  // Bias nearby areas when current coordinates are available.
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const delta = 0.35;
    const left = lng - delta;
    const right = lng + delta;
    const top = lat + delta;
    const bottom = lat - delta;
    url.searchParams.set('viewbox', `${left},${top},${right},${bottom}`);
    url.searchParams.set('bounded', '0');
  }

  const response = await fetch(url.toString(), { headers: NOMINATIM_HEADERS });
  if (!response.ok) {
    throw new Error(`Nominatim search failed: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data.map(normalizeNominatimResult) : [];
};

const nominatimReverse = async (lat, lng) => {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));

  const response = await fetch(url.toString(), { headers: NOMINATIM_HEADERS });
  if (!response.ok) {
    throw new Error(`Nominatim reverse failed: ${response.status}`);
  }

  const result = await response.json();
  const address = result.address || {};

  return {
    formatted: result.display_name || `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`,
    area: getArea(address),
    city: address.city || address.town || address.village || '',
    state: address.state || '',
    zip: address.postcode || '',
    lat: safeNum(result.lat) ?? safeNum(lat),
    lng: safeNum(result.lon) ?? safeNum(lng),
    place_id: toOsmPlaceId(result),
  };
};

const nominatimLookupByPlaceId = async (placeId) => {
  const osmId = fromOsmPlaceId(placeId);
  if (!osmId) {
    throw new Error('Invalid OpenStreetMap place_id format');
  }

  const url = new URL(`${NOMINATIM_BASE}/lookup`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('osm_ids', osmId);

  const response = await fetch(url.toString(), { headers: NOMINATIM_HEADERS });
  if (!response.ok) {
    throw new Error(`Nominatim lookup failed: ${response.status}`);
  }

  const data = await response.json();
  const item = Array.isArray(data) ? data[0] : null;
  if (!item) {
    throw new Error('Place details not found');
  }

  const normalized = normalizeNominatimResult(item);
  return {
    place_id: normalized.place_id,
    formatted: normalized.display_name || `${normalized.title}, ${normalized.subtitle}`,
    area: normalized.area,
    city: normalized.city,
    state: normalized.state,
    zip: normalized.zip,
    lat: normalized.lat,
    lng: normalized.lng,
  };
};

// ── GET /api/location/search?q=... ──────────────────────────
// Proxies Google Places Autocomplete — keeps API key server-side
const searchLocation = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!q) return err(res, 'Query parameter "q" is required', 400);

  const apiKey = GOOGLE_MAPS_KEY();
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    try {
      const osmResults = await nominatimSearch(q, lat, lng);
      return ok(res, osmResults, 'OpenStreetMap suggestions');
    } catch (e) {
      console.error('[Location] Nominatim search failed:', e.message);
      return err(res, 'Location search failed', 500);
    }
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', q);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('components', 'country:in'); // restrict to India
    url.searchParams.set('types', 'geocode');

    // Bias suggestions near current user location for Google-like relevance.
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      url.searchParams.set('location', `${lat},${lng}`);
      url.searchParams.set('radius', '50000');
      url.searchParams.set('strictbounds', 'false');
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[Location] Places API error:', data.status, data.error_message);
      return err(res, `Places API error: ${data.status}`, 502);
    }

    const results = (data.predictions || []).map(p => ({
      place_id: p.place_id,
      title: p.structured_formatting?.main_text || p.description,
      subtitle: p.structured_formatting?.secondary_text || '',
    }));

    return ok(res, results);
  } catch (e) {
    console.error('[Location] Search failed:', e.message);
    return err(res, 'Location search failed', 500);
  }
});

// ── GET /api/location/place-details?place_id=... ───────────
// Resolves a Google Place ID to exact coordinates/address
const placeDetails = asyncHandler(async (req, res) => {
  const placeId = (req.query.place_id || '').trim();
  if (!placeId) return err(res, 'place_id query param is required', 400);

  const apiKey = GOOGLE_MAPS_KEY();
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    try {
      const osmDetails = await nominatimLookupByPlaceId(placeId);
      return ok(res, osmDetails, 'OpenStreetMap place details');
    } catch (e) {
      console.error('[Location] Nominatim place details failed:', e.message);
      return err(res, 'Place details failed', 500);
    }
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('fields', 'place_id,formatted_address,address_components,geometry/location,name');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('[Location] Place details API error:', data.status, data.error_message);
      return err(res, `Place details API error: ${data.status}`, 502);
    }

    const result = data.result;
    if (!result?.geometry?.location) {
      return err(res, 'Place details not found', 404);
    }

    const get = (type) =>
      result.address_components?.find(c => c.types.includes(type))?.long_name || '';

    return ok(res, {
      place_id: result.place_id,
      formatted: result.formatted_address || result.name || '',
      area: get('sublocality_level_1') || get('sublocality') || get('neighborhood') || get('locality') || result.name || '',
      city: get('locality') || get('administrative_area_level_2'),
      state: get('administrative_area_level_1'),
      zip: get('postal_code'),
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    });
  } catch (e) {
    console.error('[Location] Place details failed:', e.message);
    return err(res, 'Place details failed', 500);
  }
});

// ── GET /api/location/reverse-geocode?lat=...&lng=... ───────
// Proxies Google Geocoding reverse — keeps API key server-side
const reverseGeocode = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return err(res, 'lat and lng query params are required', 400);

  const apiKey = GOOGLE_MAPS_KEY();
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    try {
      const osmReverse = await nominatimReverse(lat, lng);
      return ok(res, osmReverse, 'OpenStreetMap reverse geocode');
    } catch (e) {
      console.error('[Location] Nominatim reverse geocode failed:', e.message);
      return err(res, 'Reverse geocode failed', 500);
    }
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('language', 'en');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('[Location] Geocode API error:', data.status, data.error_message);
      return err(res, `Geocode API error: ${data.status}`, 502);
    }

    const result = data.results?.[0];
    if (!result) return err(res, 'No geocode results', 404);

    // Extract address components
    const get = (type) =>
      result.address_components?.find(c => c.types.includes(type))?.long_name || '';

    return ok(res, {
      formatted: result.formatted_address || '',
      area: get('sublocality_level_1') || get('sublocality') || get('neighborhood') || get('locality'),
      city: get('locality') || get('administrative_area_level_2'),
      state: get('administrative_area_level_1'),
      zip: get('postal_code'),
    });
  } catch (e) {
    console.error('[Location] Reverse geocode failed:', e.message);
    return err(res, 'Reverse geocode failed', 500);
  }
});

// ── GET /api/location/maps-key ──────────────────────────────
// Returns the Maps API key to frontend for JS API loading
// (In production, restrict this key to frontend domain referers)
const getMapsKey = asyncHandler(async (req, res) => {
  const apiKey = GOOGLE_MAPS_KEY();
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return ok(res, { key: null }, 'No maps API key configured');
  }
  return ok(res, { key: apiKey });
});

module.exports = { searchLocation, reverseGeocode, placeDetails, getMapsKey };
