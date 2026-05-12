// Only allow these skill types for pricing and worker association
const ALLOWED_SKILL_TYPES = [
    "Carpenter",
    "Fabricator / Welder",
    "Mason",
    "Electrical",
    "Plumbing",
    "False Ceiling",
    "Tiles Laying",
    "AAC Panel Work",
];
import { storage } from "../storage";
export class ManpowerPricingService {
    validateHours(hours) {
        if (!Number.isFinite(hours) || hours <= 0) {
            throw new Error("hours must be a positive number");
        }
    }
    validatePricingInput(data) {
        const numericFields = [
            { key: "basePrice", value: data.basePrice },
            { key: "ratePerHour", value: data.ratePerHour },
            { key: "minHours", value: data.minHours },
        ];
        for (const field of numericFields) {
            if (field.value == null)
                continue;
            const num = Number(field.value);
            if (!Number.isFinite(num) || num < 0) {
                throw new Error(`${field.key} must be a non-negative number`);
            }
        }
        if (data.serviceCode !== undefined && !data.serviceCode.trim()) {
            throw new Error("serviceCode cannot be empty");
        }
    }
    /**
     * Calculate service charge based on hours
     * Formula: basePrice + (ratePerHour * (hours - minHours))
     * If hours < minHours, only basePrice is charged
     */
    calculateServiceCharge(hours, pricing) {
        this.validateHours(hours);
        const basePrice = Number(pricing.basePrice);
        const ratePerHour = Number(pricing.ratePerHour);
        const minHours = Number(pricing.minHours) || 1;
        // Fixed-price service mode: ratePerHour <= 0 means flat price regardless of hours
        if (ratePerHour <= 0) {
            return {
                basePrice,
                hourlyCharge: 0,
                totalCharge: Math.round(basePrice),
                breakdown: `Fixed price service: ₹${Math.round(basePrice)} (up to ${minHours} hr included)`,
            };
        }
        // Calculate billable hours (hours beyond minimum)
        const billableHours = Math.max(0, hours - minHours);
        const hourlyCharge = Math.round(billableHours * ratePerHour);
        const totalCharge = Math.round(basePrice + hourlyCharge);
        const breakdown = minHours > 0
            ? `Base price (includes ${minHours} hr): ₹${basePrice} + ${billableHours.toFixed(1)} hr × ₹${ratePerHour}/hr = ₹${totalCharge}`
            : `Base price: ₹${basePrice} + ${hours.toFixed(1)} hr × ₹${ratePerHour}/hr = ₹${totalCharge}`;
        return {
            basePrice,
            hourlyCharge,
            totalCharge,
            breakdown,
        };
    }
    /**
     * Get service estimate for a specific service code
     */
    async getServiceEstimate(serviceCode, hours) {
        this.validateHours(hours);
        const pricing = await storage.getManpowerPricingByCode(serviceCode);
        if (!pricing) {
            throw new Error(`No pricing found for service code: ${serviceCode}`);
        }
        if (!pricing.isActive) {
            throw new Error(`Pricing for service ${serviceCode} is currently inactive`);
        }
        const calculation = this.calculateServiceCharge(hours, pricing);
        return {
            serviceCode: pricing.serviceCode,
            serviceName: pricing.serviceName,
            serviceCategory: pricing.serviceCategory,
            hours,
            estimatedDuration: pricing.estimatedDuration,
            ...calculation,
        };
    }
    /**
     * Get all service estimates for a category
     */
    async getCategoryEstimates(category, hours) {
        this.validateHours(hours);
        const categoryPricing = await storage.getManpowerPricingByCategory(category);
        const activePricing = categoryPricing.filter(p => p.isActive);
        return activePricing.map((pricing) => {
            const calculation = this.calculateServiceCharge(hours, pricing);
            return {
                serviceCode: pricing.serviceCode,
                serviceName: pricing.serviceName,
                serviceCategory: pricing.serviceCategory,
                description: pricing.description,
                estimatedDuration: pricing.estimatedDuration,
                hours,
                ...calculation,
            };
        });
    }
    /**
     * Get all services organized by category, with workers for each service
     */
    async getAllServicesGroupedWithWorkers() {
        const allPricing = (await storage.getManpowerPricing()).filter(p => p.isActive && ALLOWED_SKILL_TYPES.includes(p.serviceName));
        // For each pricing, fetch workers with matching skill/category
        const grouped = {};
        for (const pricing of allPricing) {
            if (!grouped[pricing.serviceCategory]) {
                grouped[pricing.serviceCategory] = [];
            }
            // Find workers with matching skillName only from allowed types
            const allWorkers = await storage.getManpower();
            const workers = allWorkers.filter((w) => w.skillName && ALLOWED_SKILL_TYPES.includes(w.skillName)
                && w.skillName.toLowerCase() === pricing.serviceName.toLowerCase());
            grouped[pricing.serviceCategory].push({ ...pricing, workers });
        }
        return grouped;
    }
    /**
     * Get all manpower pricing (for admin)
     */
    async listAllPricing() {
        return await storage.getManpowerPricing();
    }
    /**
     * Get unique categories
     */
    async getCategories() {
        const allPricing = await storage.getManpowerPricing();
        const activePricing = allPricing.filter(p => p.isActive);
        const categories = [...new Set(activePricing.map(p => p.serviceCategory))];
        return categories.sort();
    }
    /**
     * Create new manpower pricing
     */
    async createPricing(data) {
        this.validatePricingInput(data);
        return await storage.createManpowerPricing(data);
    }
    /**
     * Update manpower pricing
     */
    async updatePricing(id, data) {
        this.validatePricingInput(data);
        return await storage.updateManpowerPricing(id, data);
    }
    /**
     * Hard-delete a single manpower pricing entry
     */
    async deletePricing(id) {
        return await storage.deleteManpowerPricing(id);
    }
    /**
     * Hard-delete ALL manpower pricing entries
     */
    async deleteAllPricing() {
        return await storage.deleteAllManpowerPricing();
    }
    /**
     * Seed default pricing for common services (like Urban Company)
     */
    async seedDefaultPricing() {
        const defaultPricing = [
            // Cleaning Services
            { serviceCategory: "Cleaning", serviceName: "Home Deep Cleaning", serviceCode: "CLN-001", description: "Complete deep cleaning of home including kitchen, bathrooms, and all rooms", basePrice: "1499", ratePerHour: "300", minHours: "3", estimatedDuration: "3-5 hours" },
            { serviceCategory: "Cleaning", serviceName: "Bathroom Cleaning", serviceCode: "CLN-002", description: "Deep cleaning of bathrooms with scrubbing and sanitization", basePrice: "499", ratePerHour: "200", minHours: "1", estimatedDuration: "1-2 hours" },
            { serviceCategory: "Cleaning", serviceName: "Kitchen Cleaning", serviceCode: "CLN-003", description: "Complete kitchen cleaning including chimney and appliances", basePrice: "799", ratePerHour: "250", minHours: "2", estimatedDuration: "2-3 hours" },
            { serviceCategory: "Cleaning", serviceName: "Sofa Cleaning", serviceCode: "CLN-004", description: "Professional sofa cleaning and sanitization", basePrice: "599", ratePerHour: "200", minHours: "1", estimatedDuration: "1-2 hours" },
            // Plumbing Services
            { serviceCategory: "Plumbing", serviceName: "Tap Repair/Replacement", serviceCode: "PLB-001", description: "Repair or replace faulty taps and faucets", basePrice: "199", ratePerHour: "150", minHours: "1", estimatedDuration: "30 min - 1 hour" },
            { serviceCategory: "Plumbing", serviceName: "Toilet Repair", serviceCode: "PLB-002", description: "Fix toilet flush, seat, and leakage issues", basePrice: "299", ratePerHour: "200", minHours: "1", estimatedDuration: "1-2 hours" },
            { serviceCategory: "Plumbing", serviceName: "Pipe Leakage Repair", serviceCode: "PLB-003", description: "Fix pipe leakages and seepage issues", basePrice: "349", ratePerHour: "200", minHours: "1", estimatedDuration: "1-2 hours" },
            { serviceCategory: "Plumbing", serviceName: "Drainage Cleaning", serviceCode: "PLB-004", description: "Clear blocked drains and pipes", basePrice: "399", ratePerHour: "200", minHours: "1", estimatedDuration: "1-2 hours" },
            // Electrical Services
            { serviceCategory: "Electrical", serviceName: "Fan Installation", serviceCode: "ELC-001", description: "Install ceiling or wall fan", basePrice: "249", ratePerHour: "150", minHours: "1", estimatedDuration: "30 min - 1 hour" },
            { serviceCategory: "Electrical", serviceName: "Light/Lamp Repair", serviceCode: "ELC-002", description: "Repair or replace lights and lamps", basePrice: "149", ratePerHour: "100", minHours: "1", estimatedDuration: "30 min - 1 hour" },
            { serviceCategory: "Electrical", serviceName: "Switch/Socket Repair", serviceCode: "ELC-003", description: "Repair or replace electrical switches and sockets", basePrice: "149", ratePerHour: "100", minHours: "1", estimatedDuration: "30 min - 1 hour" },
            { serviceCategory: "Electrical", serviceName: "Wiring Work", serviceCode: "ELC-004", description: "New wiring or rewiring work", basePrice: "499", ratePerHour: "250", minHours: "2", estimatedDuration: "2-4 hours" },
            // Carpentry Services
            { serviceCategory: "Carpentry", serviceName: "Furniture Assembly", serviceCode: "CRP-001", description: "Assemble flat-pack furniture", basePrice: "299", ratePerHour: "200", minHours: "1", estimatedDuration: "1-2 hours" },
            { serviceCategory: "Carpentry", serviceName: "Door Repair", serviceCode: "CRP-002", description: "Fix door hinges, locks, and alignment", basePrice: "249", ratePerHour: "150", minHours: "1", estimatedDuration: "1 hour" },
            { serviceCategory: "Carpentry", serviceName: "Cabinet/Shelf Installation", serviceCode: "CRP-003", description: "Install cabinets, shelves, and storage units", basePrice: "349", ratePerHour: "200", minHours: "1", estimatedDuration: "1-2 hours" },
            // AC Services
            { serviceCategory: "AC Service", serviceName: "AC Service & Cleaning", serviceCode: "AC-001", description: "Complete AC service with cleaning and gas check", basePrice: "499", ratePerHour: "300", minHours: "1", estimatedDuration: "1-2 hours" },
            { serviceCategory: "AC Service", serviceName: "AC Installation", serviceCode: "AC-002", description: "Install new AC unit", basePrice: "999", ratePerHour: "400", minHours: "2", estimatedDuration: "2-3 hours" },
            { serviceCategory: "AC Service", serviceName: "AC Gas Refill", serviceCode: "AC-003", description: "AC gas refilling and leak check", basePrice: "1499", ratePerHour: "300", minHours: "1", estimatedDuration: "1-2 hours" },
            // Painting Services
            { serviceCategory: "Painting", serviceName: "Room Painting", serviceCode: "PNT-001", description: "Complete room painting with premium paints", basePrice: "2999", ratePerHour: "400", minHours: "4", estimatedDuration: "1-2 days" },
            { serviceCategory: "Painting", serviceName: "Wall Touch-up", serviceCode: "PNT-002", description: "Touch-up painting for walls", basePrice: "499", ratePerHour: "200", minHours: "1", estimatedDuration: "2-3 hours" },
            // Appliance Repair
            { serviceCategory: "Appliance Repair", serviceName: "Washing Machine Repair", serviceCode: "APL-001", description: "Repair washing machine issues", basePrice: "399", ratePerHour: "250", minHours: "1", estimatedDuration: "1-2 hours" },
            { serviceCategory: "Appliance Repair", serviceName: "Refrigerator Repair", serviceCode: "APL-002", description: "Repair refrigerator and freezer issues", basePrice: "399", ratePerHour: "250", minHours: "1", estimatedDuration: "1-2 hours" },
            { serviceCategory: "Appliance Repair", serviceName: "Microwave Repair", serviceCode: "APL-003", description: "Repair microwave oven issues", basePrice: "349", ratePerHour: "200", minHours: "1", estimatedDuration: "1 hour" },
        ];
        const results = [];
        for (const pricing of defaultPricing) {
            // Check if already exists
            const existing = await storage.getManpowerPricingByCode(pricing.serviceCode);
            if (!existing) {
                const created = await storage.createManpowerPricing(pricing);
                results.push(created);
            }
        }
        return results;
    }
}
export const manpowerPricingService = new ManpowerPricingService();
