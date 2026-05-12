'use strict';

const {
  getActiveVehiclePricingRows,
  calculateDeliveryCharge,
} = require('../services/pricingService');

async function getVehiclePricing(request, reply) {
  try {
    const rows = await getActiveVehiclePricingRows();
    return reply.send({
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        vehicle_type: row.vehicle_type,
        display_name: row.display_name,
        base_fare: Number(row.base_fare || 0),
        rate_per_km: Number(row.rate_per_km || 0),
        min_km: Number(row.min_km || 0),
        is_active: row.is_active !== false,
      })),
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch vehicle pricing',
    });
  }
}

async function getDeliveryCharge(request, reply) {
  const {
    vehicle_type: vehicleType,
    origin_lat: originLat,
    origin_lng: originLng,
    dest_lat: destLat,
    dest_lng: destLng,
  } = request.query || {};

  if (!vehicleType) {
    return reply.code(400).send({
      success: false,
      message: 'vehicle_type is required',
    });
  }

  try {
    const calculated = await calculateDeliveryCharge({
      vehicleType,
      originLat,
      originLng,
      destLat,
      destLng,
    });

    return reply.send({
      success: true,
      data: {
        vehicle_type: calculated.vehicleType,
        display_name: calculated.displayName,
        distance_km: calculated.distanceKm,
        base_fare: calculated.baseFare,
        rate_per_km: calculated.ratePerKm,
        min_km: calculated.minKm,
        extra_km: calculated.extraKm,
        delivery_charge: calculated.deliveryCharge,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(400).send({
      success: false,
      message: error.message || 'Failed to calculate delivery charge',
    });
  }
}

module.exports = {
  getVehiclePricing,
  getDeliveryCharge,
};
