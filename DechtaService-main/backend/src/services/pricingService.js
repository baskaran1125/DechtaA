'use strict';

const db = require('../config/database');

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function calculateHaversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return round2(R * c);
}

function normalizeVehicleTypeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '')
    .replace(/[^a-z0-9.\-]/g, '');
}

function canonicalVehicleType(value) {
  const token = normalizeVehicleTypeToken(value);
  if (!token) return '';

  if (token.includes('2w') || token.includes('2wheel') || token.includes('twowheel')) {
    return '2w';
  }
  if (token.includes('3w') || token.includes('3wheel') || token.includes('threewheel')) {
    return '3w';
  }
  if (token.includes('4w') || token.includes('4wheel') || token.includes('fourwheel')) {
    if (token.includes('750')) return '4w-750kg';
    if (token.includes('1.4') || token.includes('14ton')) return '4w-1.4ton';
    if (token.includes('1.7') || token.includes('17ton')) return '4w-1.7ton';
    if (token.includes('2.5') || token.includes('25ton')) return '4w-2.5ton';
    return '4w';
  }

  return token;
}

function sortByBaseFare(rows) {
  return [...rows].sort((a, b) => Number(a.base_fare || 0) - Number(b.base_fare || 0));
}

function pickPricingRow(rows, requestedVehicleType) {
  const requestedCanonical = canonicalVehicleType(requestedVehicleType);
  const withCanonical = rows.map((row) => ({
    ...row,
    _canonical: canonicalVehicleType(row.vehicle_type),
  }));

  if (!requestedCanonical) {
    return sortByBaseFare(withCanonical)[0] || null;
  }

  const exact = withCanonical.find((row) => row._canonical === requestedCanonical);
  if (exact) return exact;

  if (requestedCanonical === '2w' || requestedCanonical === '3w') {
    return withCanonical.find((row) => row._canonical === requestedCanonical) || null;
  }

  if (requestedCanonical.startsWith('4w')) {
    const all4w = sortByBaseFare(withCanonical.filter((row) => row._canonical.startsWith('4w')));
    if (requestedCanonical === '4w') {
      return all4w[0] || null;
    }
    const specific = all4w.find((row) => row._canonical === requestedCanonical);
    return specific || all4w[0] || null;
  }

  return sortByBaseFare(withCanonical)[0] || null;
}

async function getActiveVehiclePricingRows() {
  const result = await db.query(
    `
      SELECT id, vehicle_type, display_name, base_fare, rate_per_km, min_km, is_active
      FROM vehicle_pricing
      WHERE COALESCE(is_active, true) = true
      ORDER BY base_fare ASC, id ASC
    `
  );
  return result.rows || [];
}

async function resolveVehiclePricing(vehicleType) {
  const rows = await getActiveVehiclePricingRows();
  if (!rows.length) return null;
  return pickPricingRow(rows, vehicleType);
}

function calculateChargeFromPricing(distanceKm, pricingRow) {
  const baseFare = toFiniteNumber(pricingRow?.base_fare) || 0;
  const ratePerKm = toFiniteNumber(pricingRow?.rate_per_km) || 0;
  const minKm = toFiniteNumber(pricingRow?.min_km) || 0;
  const extraKm = Math.max(0, distanceKm - minKm);
  const deliveryCharge = baseFare + extraKm * ratePerKm;

  return {
    distanceKm: round2(distanceKm),
    baseFare: round2(baseFare),
    ratePerKm: round2(ratePerKm),
    minKm: round2(minKm),
    extraKm: round2(extraKm),
    deliveryCharge: round2(deliveryCharge),
  };
}

async function calculateDeliveryCharge({
  vehicleType,
  originLat,
  originLng,
  destLat,
  destLng,
}) {
  const fromLat = toFiniteNumber(originLat);
  const fromLng = toFiniteNumber(originLng);
  const toLat = toFiniteNumber(destLat);
  const toLng = toFiniteNumber(destLng);

  if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
    throw new Error('Valid origin and destination coordinates are required');
  }

  const pricingRow = await resolveVehiclePricing(vehicleType);
  if (!pricingRow) {
    throw new Error(`No active vehicle pricing found for vehicle type "${vehicleType}"`);
  }

  const distanceKm = calculateHaversineKm(fromLat, fromLng, toLat, toLng);
  const charge = calculateChargeFromPricing(distanceKm, pricingRow);

  return {
    vehicleType: pricingRow.vehicle_type,
    displayName: pricingRow.display_name,
    pricingRow,
    ...charge,
  };
}

module.exports = {
  toFiniteNumber,
  calculateHaversineKm,
  normalizeVehicleTypeToken,
  getActiveVehiclePricingRows,
  resolveVehiclePricing,
  calculateChargeFromPricing,
  calculateDeliveryCharge,
};
