import { storage } from "../storage";
export class PricingService {
    /**
     * Calculate delivery charge based on vehicle type and distance
     * Formula: baseFare + (ratePerKm * (distanceKm - minKm))
     * If distance < minKm, only baseFare is charged
     */
    calculateDeliveryCharge(distanceKm, pricing) {
        const baseFare = Number(pricing.baseFare);
        const ratePerKm = Number(pricing.ratePerKm);
        const minKm = Number(pricing.minKm) || 0;
        // Calculate billable distance (distance beyond minimum km)
        const billableKm = Math.max(0, distanceKm - minKm);
        const distanceCharge = Math.round(billableKm * ratePerKm);
        const totalCharge = Math.round(baseFare + distanceCharge);
        const breakdown = minKm > 0
            ? `Base fare (includes ${minKm} km): ₹${baseFare} + ${billableKm.toFixed(1)} km × ₹${ratePerKm}/km = ₹${totalCharge}`
            : `Base fare: ₹${baseFare} + ${distanceKm.toFixed(1)} km × ₹${ratePerKm}/km = ₹${totalCharge}`;
        return {
            baseFare,
            distanceCharge,
            totalCharge,
            breakdown,
        };
    }
    /**
     * Get delivery estimate for a specific vehicle type
     */
    async getDeliveryEstimate(vehicleType, distanceKm) {
        const pricing = await storage.getVehiclePricingByType(vehicleType);
        if (!pricing) {
            throw new Error(`No pricing found for vehicle type: ${vehicleType}`);
        }
        if (!pricing.isActive) {
            throw new Error(`Pricing for vehicle type ${vehicleType} is currently inactive`);
        }
        const calculation = this.calculateDeliveryCharge(distanceKm, pricing);
        return {
            vehicleType: pricing.vehicleType,
            displayName: pricing.displayName,
            distanceKm,
            ...calculation,
        };
    }
    /**
     * Get delivery estimates for all vehicle types
     */
    async getAllDeliveryEstimates(distanceKm) {
        const allPricing = await storage.getVehiclePricing();
        const activePricing = allPricing.filter(p => p.isActive);
        return activePricing.map((pricing) => {
            const calculation = this.calculateDeliveryCharge(distanceKm, pricing);
            return {
                vehicleType: pricing.vehicleType,
                displayName: pricing.displayName,
                distanceKm,
                ...calculation,
            };
        });
    }
    /**
     * Get all vehicle pricing (for admin)
     */
    async listAllPricing() {
        return await storage.getVehiclePricing();
    }
    /**
     * Create new vehicle pricing
     */
    async createPricing(data) {
        return await storage.createVehiclePricing(data);
    }
    /**
     * Update vehicle pricing
     */
    async updatePricing(id, data) {
        return await storage.updateVehiclePricing(id, data);
    }
    /**
     * Delete (deactivate) vehicle pricing
     */
    async deletePricing(id) {
        return await storage.deleteVehiclePricing(id);
    }
    /**
     * Seed default pricing for all vehicle types
     */
    async seedDefaultPricing() {
        const defaultPricing = [
            { vehicleType: "2W", displayName: "Two Wheeler", baseFare: "30", ratePerKm: "5", minKm: "2" },
            { vehicleType: "3W", displayName: "Three Wheeler (Auto)", baseFare: "50", ratePerKm: "8", minKm: "2" },
            { vehicleType: "4W-750kg", displayName: "4 Wheeler - 750 kg", baseFare: "150", ratePerKm: "12", minKm: "3" },
            { vehicleType: "4W-1.4ton", displayName: "4 Wheeler - 1.4 Ton", baseFare: "200", ratePerKm: "14", minKm: "3" },
            { vehicleType: "4W-1.7ton", displayName: "4 Wheeler - 1.7 Ton", baseFare: "250", ratePerKm: "16", minKm: "3" },
            { vehicleType: "4W-2.5ton", displayName: "4 Wheeler - 2.5 Ton", baseFare: "350", ratePerKm: "18", minKm: "3" },
        ];
        const results = [];
        for (const pricing of defaultPricing) {
            // Check if already exists
            const existing = await storage.getVehiclePricingByType(pricing.vehicleType);
            if (!existing) {
                const created = await storage.createVehiclePricing(pricing);
                results.push(created);
            }
        }
        return results;
    }
}
export const pricingService = new PricingService();
