import { storage } from "../storage";
import { type InsertCatalogItem } from "../shared/schema";

export class OpsService {
    async getCatalogItems() {
        return await storage.getCatalogItems();
    }

    async createCatalogItem(data: InsertCatalogItem & { vendorId?: number }) {
        return await storage.createCatalogItem(data);
    }

    async getStats(dateFilter?: { startDate?: Date; endDate?: Date }) {
        return await storage.getStats(dateFilter);
    }
}

export const opsService = new OpsService();
