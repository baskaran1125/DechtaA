// src/routes/location.js

async function reverseGeocodeHandler(request, reply) {
  const lat = Number(request.query.lat);
  const lng = Number(request.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return reply.code(400).send({
      success: false,
      message: 'lat and lng query parameters are required',
    });
  }

  const qLat = lat.toFixed(6);
  const qLng = lng.toFixed(6);
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(qLat)}&lon=${encodeURIComponent(qLng)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DechtaService/1.0',
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocode failed with status ${response.status}`);
    }

    const raw = await response.json();
    const address = raw?.address || {};

    return reply.send({
      success: true,
      data: {
        formatted: raw?.display_name || `${qLat}, ${qLng}`,
        area: address.suburb || address.neighbourhood || address.road || address.hamlet || '',
        city: address.city || address.town || address.village || address.county || '',
        state: address.state || '',
        zip: address.postcode || '',
        lat: qLat,
        lng: qLng,
      },
    });
  } catch (error) {
    request.log.warn({ err: error, lat: qLat, lng: qLng }, 'Reverse geocode fallback response');
    return reply.send({
      success: true,
      data: {
        formatted: `${qLat}, ${qLng}`,
        area: '',
        city: '',
        state: '',
        zip: '',
        lat: qLat,
        lng: qLng,
      },
    });
  }
}

async function locationRoutes(fastify, options) {
  fastify.get('/reverse-geocode', { handler: reverseGeocodeHandler });
}

module.exports = locationRoutes;